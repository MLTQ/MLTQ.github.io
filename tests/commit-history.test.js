import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sumHistory, dayNumber, historyCells, historyRepos, validateRecord, validateSnapshot } from '../commit-history.js';
import { renderCommitField } from '../commit-field.js';
import { readContributions, readCalendar } from '../scripts/github-contributions.js';
import projects from '../content/projects.js';

const record = daily => ({ ...sumHistory([{ daily }]), repositories: [{ repo: 'Owner/project' }] });
const account = daily => ({ ...sumHistory([{ daily }], 'contributions'), login: 'Owner' });
const fixture = () => ({ totalCommitContributions: 9, commitContributionsByRepository: [
  { repository: { nameWithOwner: 'Owner/project', isPrivate: false }, contributions: {
    totalCount: 7, nodes: [{ occurredAt: '2024-02-28T08:00:00Z', commitCount: 3 }, { occurredAt: '2024-02-29T08:00:00Z', commitCount: 4 }], pageInfo: { hasNextPage: false },
  } },
  { repository: { nameWithOwner: 'Owner/private', isPrivate: true }, contributions: {
    totalCount: 2, nodes: [{ occurredAt: '2024-02-29T08:00:00Z', commitCount: 2 }], pageInfo: { hasNextPage: false },
  } },
] });

test('GitHub daily counts are checked as commits, preserve calendar days, and omit private sources', () => {
  const sources = readContributions(fixture(), '2024-02-01', '2024-02-29');
  assert.deepEqual(sources, [{ repo: 'Owner/project', daily: [['2024-02-28', 3], ['2024-02-29', 4]] }]);
  assert.equal(sumHistory(sources).totalCommits, 7);
});

test('truncated repositories, incomplete pages, wrong totals, and out-of-range days fail closed', () => {
  const mutations = [
    f => f.totalCommitContributions++,
    f => f.commitContributionsByRepository[0].contributions.pageInfo.hasNextPage = true,
    f => f.commitContributionsByRepository[0].contributions.totalCount++,
    f => f.commitContributionsByRepository[0].contributions.nodes[0].occurredAt = '2024-01-31T08:00:00Z',
    f => f.commitContributionsByRepository[0].contributions.nodes[1].occurredAt = '2024-02-28T08:00:00Z',
    f => f.commitContributionsByRepository[0].repository.isPrivate = null,
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f);
    assert.throws(() => readContributions(f, '2024-02-01', '2024-02-29'));
  }
});

test('a short project sits inside a complete field of real surrounding activity', () => {
  const project = record([['2024-03-02', 4]]);
  const all = account([['2024-02-25', 2], ['2024-02-28', 5], ['2024-02-29', 3], ['2024-03-02', 9], ['2024-03-03', 999]]);
  const { cells, daysPerCell } = historyCells(project, all, 7);
  assert.equal(daysPerCell, 1);
  assert.equal(cells[0].start, '2024-02-25');
  assert.deepEqual(cells.at(-1), { start: '2024-03-02', end: '2024-03-02', count: 4, total: 9 });
  assert.deepEqual(cells.map(c => c.total), [2, 0, 0, 5, 3, 0, 9]);
  assert.equal(cells.reduce((sum, cell) => sum + cell.total, 0), 19);
  assert.ok(cells.every(cell => cell !== null));
  assert.throws(() => dayNumber('2023-02-29'), /Invalid UTC date/);
});

test('long histories conserve every project commit and the exact matching background interval', () => {
  const start = dayNumber('2012-12-31');
  const date = day => new Date(day * 86400000).toISOString().slice(0, 10);
  for (const duration of [1, 181, 182, 183, 280, 281, 5000]) {
    const projectDays = [], allDays = [];
    for (let offset = -300; offset <= duration + 2; offset++) {
      const projectCount = offset >= 0 && offset < duration && (offset % 17 === 0 || offset === duration - 1) ? offset % 7 + 1 : 0;
      if (projectCount) projectDays.push([date(start + offset), projectCount]);
      allDays.push([date(start + offset), projectCount + 3]);
    }
    const project = record(projectDays), all = account(allDays);
    for (const slots of [14, 182, 280]) {
      const { cells, daysPerCell } = historyCells(project, all, slots);
      assert.equal(cells.length, slots);
      assert.ok(cells[0].start <= project.firstCommit);
      assert.equal(cells.at(-1).end, project.lastCommit);
      assert.ok(cells.at(-1).count > 0);
      assert.equal(cells.reduce((sum, cell) => sum + cell.count, 0), project.totalCommits);
      cells.forEach((cell, index) => {
        if (index) assert.equal(dayNumber(cell.start), dayNumber(cells[index - 1].end) + 1);
        assert.equal(dayNumber(cell.end) - dayNumber(cell.start) + 1, daysPerCell);
        for (const [daily, key] of [[projectDays, 'count'], [allDays, 'total']]) {
          assert.equal(cell[key], daily.filter(([day]) => day >= cell.start && day <= cell.end).reduce((sum, [, n]) => sum + n, 0));
        }
      });
    }
  }
});

test('combined projects use the same contribution accounting as the overall history', () => {
  const a = { daily: [['2024-02-28', 2], ['2024-02-29', 3]] };
  const b = { daily: [['2024-02-29', 4]] };
  const c = { daily: [['2024-02-29', 5]] };
  const combined = sumHistory([a, b]);
  assert.deepEqual(combined.daily, [['2024-02-28', 2], ['2024-02-29', 7]]);
  const { cells } = historyCells(combined, sumHistory([a, b, c], 'contributions'), 7);
  assert.equal(cells.at(-1).count, 7);
  assert.equal(cells.at(-1).total, 12);
});

test('invalid totals, changed mappings, and project counts exceeding overall activity are rejected', () => {
  const history = record([['2020-01-01', 2]]);
  const snapshot = { version: 3, calendar: 'GitHub contribution days', scope: 'GitHub profile contributions', refreshedAt: '2026-09-05T00:00:00Z', account: account([['2020-01-01', 3]]), projects: { sample: history } };
  const project = { slug: 'sample', repo: 'Owner/project' };
  validateSnapshot(snapshot, [project]);
  assert.throws(() => validateSnapshot(snapshot, [{ ...project, repo: 'Owner/different' }]), /mapping/);
  assert.throws(() => validateSnapshot({ ...snapshot, projects: {} }, [project]), /Missing/);
  assert.throws(() => validateSnapshot({ ...snapshot, account: account([['2020-01-01', 1]]) }, [project]), /exceed/);
  assert.throws(() => historyCells(history, account([['2020-01-01', 1]]), 7), /exceed/);
  assert.throws(() => validateRecord({ ...history, totalCommits: 99 }), /totals/);
  assert.throws(() => historyRepos({ slug: 'sample', historyRepos: ['Owner/project', 'owner/Project'] }), /Duplicate/);
  assert.equal(renderCommitField(undefined), '');
  assert.equal(renderCommitField(record([])), '');
});

test('rendered colors distinguish context and project activity with exact tooltip shares', () => {
  const project = record([['2024-02-29', 3]]), all = account([['2024-02-28', 5], ['2024-02-29', 9]]);
  for (const columns of [26, 40]) {
    const html = renderCommitField(project, all, { columns, large: columns === 40 });
    const pixels = [...html.matchAll(/background:(#[a-f0-9]+)" title="([^"]+)" data-start="([^"]+)" data-end="([^"]+)" data-count="(\d+)" data-total="(\d+)"/g)];
    assert.equal(pixels.length, columns * 7);
    assert.equal(pixels.at(-1)[4], '2024-02-29');
    assert.equal(pixels.at(-1)[5], '3');
    assert.equal(pixels.at(-1)[6], '9');
    assert.notEqual(pixels.at(-1)[1], pixels.at(-2)[1]);
    assert.notEqual(pixels.at(-2)[1], pixels.at(-3)[1]);
    assert.match(pixels.at(-1)[2], /3 project commits; 9 total contributions; 6 other contributions/);
    assert.match(html, /3 commits · 14 contributions/);
    assert.match(html, /GitHub<\/a>/);
    assert.match(html, /This project/);
    assert.doesNotMatch(html, /hm-padding|STYLIZED|canvas|script/i);
  }
});

test('every saved project is a subset of account activity in both layouts', () => {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../content/commit-history.json', import.meta.url)));
  validateSnapshot(snapshot, projects);
  for (const project of Object.values(snapshot.projects)) {
    for (const slots of [182, 280]) {
      const { cells } = historyCells(project, snapshot.account, slots);
      assert.equal(cells.reduce((sum, cell) => sum + cell.count, 0), project.totalCommits);
      assert.ok(cells.every(cell => cell.count <= cell.total));
      if (project.totalCommits) {
        assert.equal(cells.at(-1).end, project.lastCommit);
        assert.ok(cells.at(-1).count > 0);
      }
    }
  }
});

const calendarFixture = () => ({ totalContributions: 20, weeks: [{ contributionDays: [
  { date: '2024-02-27', contributionCount: 9 },
  { date: '2024-02-28', contributionCount: 3 },
  { date: '2024-02-29', contributionCount: 8 },
] }] });

test('private-only activity fills the background without persisting private repository details', () => {
  const publicRepos = readContributions(fixture(), '2024-02-01', '2024-02-29');
  const calendar = readCalendar(calendarFixture(), '2024-02-27', '2024-02-29');
  const overall = { login: 'Owner', ...sumHistory([calendar], 'contributions') };
  const project = { repositories: [{ repo: publicRepos[0].repo }], ...sumHistory(publicRepos) };
  const { cells } = historyCells(project, overall, 7);
  assert.equal(overall.totalContributions, 20);
  assert.equal(project.totalCommits, 7);
  assert.deepEqual(cells.at(-3), { start: '2024-02-27', end: '2024-02-27', count: 0, total: 9 });
  assert.doesNotMatch(JSON.stringify({ overall, project }), /Owner\/private/);
  const html = renderCommitField(project, overall);
  assert.match(html, /7 commits · 20 contributions/);
  assert.match(html, /including anonymized private activity/);
  assert.match(html, /0 project commits; 9 total contributions; 9 other contributions/);
  assert.doesNotMatch(html, /7 of 20 commits|public GitHub commit activity/);
});

test('calendar ingestion rejects missing, duplicate, negative, and miscounted days', () => {
  const mutations = [
    f => f.totalContributions++,
    f => f.weeks[0].contributionDays.pop(),
    f => f.weeks[0].contributionDays[1].date = '2024-02-27',
    f => f.weeks[0].contributionDays[0].contributionCount = -1,
  ];
  for (const mutate of mutations) {
    const f = calendarFixture(); mutate(f);
    assert.throws(() => readCalendar(f, '2024-02-27', '2024-02-29'));
  }
  assert.throws(() => validateRecord({ ...account([['2024-02-29', 4]]), totalContributions: 3 }, 'contributions'), /totals/);
});
