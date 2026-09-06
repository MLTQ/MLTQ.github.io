// Calendar and counting rules shared by the collector, renderer, and tests.
const DAY = 86400000;

export function dayNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid UTC date: ${value}`);
  const n = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== value) throw new Error(`Invalid UTC date: ${value}`);
  return n / DAY;
}

const dateAt = day => new Date(day * DAY).toISOString().slice(0, 10);

export function historyRepos(project) {
  const repos = project.historyRepos ?? (project.repo ? [project.repo] : []);
  if (!Array.isArray(repos) || repos.some(r => typeof r !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(r))) {
    throw new Error(`Invalid history repositories for ${project.slug}`);
  }
  if (new Set(repos.map(r => r.toLowerCase())).size !== repos.length) throw new Error(`Duplicate history repository for ${project.slug}`);
  return repos;
}

/** All reachable commits, including merges, once per SHA across grouped repos. */
export function aggregateHistory(sources) {
  const commits = new Map();
  for (const source of sources) {
    for (const commit of source.commits) {
      if (!/^[a-f0-9]{40}$/.test(commit.oid) || !Number.isFinite(Date.parse(commit.committedDate))) throw new Error('Invalid commit record');
      const date = new Date(commit.committedDate).toISOString().slice(0, 10);
      if (commits.has(commit.oid) && commits.get(commit.oid) !== date) throw new Error('Conflicting dates for one commit');
      commits.set(commit.oid, date);
    }
  }
  const days = new Map();
  for (const date of commits.values()) days.set(date, (days.get(date) || 0) + 1);
  const daily = [...days].sort(([a], [b]) => a.localeCompare(b));
  return {
    repositories: sources.map(({ repo, branch, head, commits }) => ({ repo, branch, head, commitCount: commits.length })),
    totalCommits: commits.size,
    firstCommit: daily[0]?.[0] ?? null,
    lastCommit: daily.at(-1)?.[0] ?? null,
    daily,
  };
}

export function validateRecord(record) {
  if (!record || !Array.isArray(record.daily) || !Number.isSafeInteger(record.totalCommits) || record.totalCommits < 0) throw new Error('Invalid commit history');
  let previous = -Infinity, sum = 0;
  for (const pair of record.daily) {
    if (!Array.isArray(pair) || pair.length !== 2) throw new Error('Invalid daily count');
    const [date, count] = pair, day = dayNumber(date);
    if (day <= previous || !Number.isSafeInteger(count) || count <= 0) throw new Error('Unordered or invalid daily counts');
    previous = day;
    sum += count;
  }
  if (sum !== record.totalCommits || (record.daily[0]?.[0] ?? null) !== record.firstCommit || (record.daily.at(-1)?.[0] ?? null) !== record.lastCommit) {
    throw new Error('Commit totals or date range do not match daily history');
  }
}

export function validateSnapshot(snapshot, projects) {
  if (snapshot?.version !== 1 || snapshot.calendar !== 'UTC' || !snapshot.projects || !Number.isFinite(Date.parse(snapshot.refreshedAt))) throw new Error('Invalid commit history snapshot');
  for (const project of projects) {
    const expected = historyRepos(project).map(r => r.toLowerCase()).sort();
    const record = snapshot.projects[project.slug];
    if (!expected.length) {
      if (record) throw new Error(`Unexpected commit history for ${project.slug}; refresh history`);
      continue;
    }
    if (!record) throw new Error(`Missing commit history for ${project.slug}; run npm run history:refresh`);
    validateRecord(record);
    const actual = record.repositories?.map(r => r.repo.toLowerCase()).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error(`Repository mapping changed for ${project.slug}; refresh history`);
    for (const repo of record.repositories) {
      if (!Number.isSafeInteger(repo.commitCount) || repo.commitCount < 0 || (repo.commitCount > 0 && (!repo.branch || !/^[a-f0-9]{40}$/.test(repo.head)))) throw new Error(`Invalid history provenance for ${project.slug}`);
    }
  }
}

/** Fixed-size field, whole history, end-aligned UTC day bins; no clock input. */
export function historyCells(record, slots) {
  validateRecord(record);
  if (!Number.isSafeInteger(slots) || slots < 1) throw new Error('Invalid field size');
  if (!record.totalCommits) return { cells: Array(slots).fill(null), daysPerCell: 1 };
  const first = dayNumber(record.firstCommit), last = dayNumber(record.lastCommit);
  const daysPerCell = Math.ceil((last - first + 1) / slots);
  const count = Math.ceil((last - first + 1) / daysPerCell);
  const cells = Array.from({ length: count }, (_, i) => {
    const end = last - (count - 1 - i) * daysPerCell;
    return { start: dateAt(Math.max(first, end - daysPerCell + 1)), end: dateAt(end), count: 0 };
  });
  for (const [date, commits] of record.daily) {
    const index = count - 1 - Math.floor((last - dayNumber(date)) / daysPerCell);
    cells[index].count += commits;
  }
  return { cells: [...Array(slots - count).fill(null), ...cells], daysPerCell };
}
