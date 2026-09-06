import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aggregateHistory, dayNumber, historyCells, historyRepos, validateRecord, validateSnapshot } from '../commit-history.js';
import { renderCommitField } from '../commit-field.js';
import projects from '../content/projects.js';

const oid = n => n.toString(16).padStart(40, '0');
const source = (commits, repo = 'Owner/project') => ({ repo, branch: 'main', head: commits.at(-1)?.oid ?? null, commits });
const record = daily => ({
  daily, totalCommits: daily.reduce((sum, [, n]) => sum + n, 0),
  firstCommit: daily[0]?.[0] ?? null, lastCommit: daily.at(-1)?.[0] ?? null,
  repositories: [{ repo: 'Owner/project', branch: 'main', head: oid(1), commitCount: daily.reduce((sum, [, n]) => sum + n, 0) }],
});

test('combined repos count shared SHAs once and use UTC committer dates', () => {
  const shared = { oid: oid(1), committedDate: '2024-02-29T23:30:00-05:00' };
  const merged = aggregateHistory([
    source([shared, { oid: oid(2), committedDate: '2024-02-29T23:30:00Z' }]),
    source([shared, { oid: oid(3), committedDate: '2024-03-01T08:00:00Z' }], 'Owner/second'),
  ]);
  assert.deepEqual(merged.daily, [['2024-02-29', 1], ['2024-03-01', 2]]);
  assert.equal(merged.totalCommits, 3);
  assert.deepEqual(merged.repositories.map(r => r.commitCount), [2, 2]);
  assert.throws(() => aggregateHistory([source([shared, { ...shared, committedDate: '2025-01-01' }])]), /Conflicting/);
});

test('one-day projects end in the final pixel; earlier slots are not invented days', () => {
  const { cells, daysPerCell } = historyCells(record([['2017-01-10', 4]]), 182);
  assert.equal(daysPerCell, 1);
  assert.ok(cells.slice(0, -1).every(cell => cell === null));
  assert.deepEqual(cells.at(-1), { start: '2017-01-10', end: '2017-01-10', count: 4 });
});

test('quiet days, leap days and the final active day remain accurate', () => {
  const { cells } = historyCells(record([['2024-02-28', 2], ['2024-03-02', 3]]), 7);
  assert.deepEqual(cells, [null, null, null,
    { start: '2024-02-28', end: '2024-02-28', count: 2 },
    { start: '2024-02-29', end: '2024-02-29', count: 0 },
    { start: '2024-03-01', end: '2024-03-01', count: 0 },
    { start: '2024-03-02', end: '2024-03-02', count: 3 },
  ]);
  assert.throws(() => dayNumber('2023-02-29'), /Invalid UTC date/);
});

test('full multi-year history is conserved at every field size with no gaps or overlap', () => {
  const start = dayNumber('2012-12-31');
  const date = day => new Date(day * 86400000).toISOString().slice(0, 10);
  for (const duration of [1, 181, 182, 183, 280, 281, 5000]) {
    const daily = [];
    for (let offset = 0; offset < duration; offset++) {
      if (offset % 17 === 0 || offset === duration - 1) daily.push([date(start + offset), offset % 7 + 1]);
    }
    const history = record(daily);
    for (const slots of [14, 182, 280]) {
      const { cells, daysPerCell } = historyCells(history, slots);
      const active = cells.filter(Boolean);
      assert.equal(cells.length, slots);
      assert.equal(active[0].start, history.firstCommit);
      assert.equal(cells.at(-1).end, history.lastCommit);
      assert.ok(cells.at(-1).count > 0);
      assert.equal(active.reduce((sum, cell) => sum + cell.count, 0), history.totalCommits);
      active.forEach((cell, index) => {
        if (index) assert.equal(dayNumber(cell.start), dayNumber(active[index - 1].end) + 1);
        assert.ok(dayNumber(cell.end) - dayNumber(cell.start) + 1 <= daysPerCell);
        assert.equal(cell.count, daily.filter(([day]) => day >= cell.start && day <= cell.end).reduce((sum, [, n]) => sum + n, 0));
      });
    }
  }
});

test('missing, inconsistent, and remapped snapshots fail instead of fabricating activity', () => {
  const history = record([['2020-01-01', 2]]);
  const snapshot = { version: 1, calendar: 'UTC', refreshedAt: '2026-09-05T00:00:00Z', projects: { sample: history } };
  const project = { slug: 'sample', repo: 'Owner/project' };
  validateSnapshot(snapshot, [project]);
  assert.throws(() => validateSnapshot(snapshot, [{ ...project, repo: 'Owner/different' }]), /mapping/);
  assert.throws(() => validateSnapshot({ ...snapshot, projects: {} }, [project]), /Missing/);
  assert.throws(() => validateRecord({ ...history, totalCommits: 99 }), /totals/);
  assert.throws(() => validateRecord(record([['2020-01-02', 1], ['2020-01-01', 2]])), /Unordered/);
  assert.throws(() => historyRepos({ slug: 'sample', historyRepos: ['Owner/project', 'owner/Project'] }), /Duplicate/);
  assert.equal(renderCommitField(undefined), '');
  assert.ok(historyCells(record([]), 7).cells.every(cell => cell === null));
});

test('rendered fields expose exact final counts, date range, and repository sources', () => {
  const history = record([['2017-01-01', 2], ['2017-12-31', 3]]);
  for (const columns of [26, 40]) {
    const html = renderCommitField(history, { columns, large: columns === 40 });
    const pixels = [...html.matchAll(/data-start="([^"]+)" data-end="([^"]+)" data-count="(\d+)"/g)];
    assert.equal(pixels.at(-1)[2], '2017-12-31');
    assert.equal(pixels.at(-1)[3], '3');
    assert.equal(pixels.reduce((sum, match) => sum + Number(match[3]), 0), 5);
    assert.match(html, /5 commits · full history/);
    assert.match(html, /2017-01-01 — 2017-12-31/);
    assert.match(html, /href="https:\/\/github.com\/Owner\/project"/);
    assert.doesNotMatch(html, /STYLIZED|TRAILING|canvas|script/i);
  }
});

test('every saved project history validates and reaches its last commit in both layouts', () => {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../content/commit-history.json', import.meta.url)));
  validateSnapshot(snapshot, projects);
  for (const history of Object.values(snapshot.projects)) {
    for (const slots of [182, 280]) {
      const { cells } = historyCells(history, slots);
      assert.equal(cells.reduce((sum, cell) => sum + (cell?.count ?? 0), 0), history.totalCommits);
      if (history.totalCommits) {
        assert.equal(cells.at(-1).end, history.lastCommit);
        assert.ok(cells.at(-1).count > 0);
      }
    }
  }
});
