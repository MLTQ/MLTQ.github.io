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

/** Sum GitHub's own per-repository contribution counts on its calendar days. */
export function sumHistory(sources) {
  const days = new Map();
  for (const source of sources) {
    for (const [date, count] of source.daily) days.set(date, (days.get(date) || 0) + count);
  }
  const daily = [...days].sort(([a], [b]) => a.localeCompare(b));
  const result = {
    totalCommits: daily.reduce((sum, [, count]) => sum + count, 0),
    firstCommit: daily[0]?.[0] ?? null,
    lastCommit: daily.at(-1)?.[0] ?? null,
    daily,
  };
  validateRecord(result);
  return result;
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
  if (snapshot?.version !== 2 || snapshot.calendar !== 'GitHub contribution days' || snapshot.scope !== 'public commit contributions' || !snapshot.projects || !/^[\w-]+$/.test(snapshot.account?.login ?? '') || !Number.isFinite(Date.parse(snapshot.refreshedAt))) throw new Error('Invalid commit activity snapshot; run npm run history:refresh');
  validateRecord(snapshot.account);
  const overall = new Map(snapshot.account.daily);
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
    for (const [date, count] of record.daily) {
      if (count > (overall.get(date) ?? 0)) throw new Error(`Project contributions exceed overall activity for ${project.slug} on ${date}`);
    }
  }
}

/** Full project history plus surrounding activity, always ending at its last contribution. */
export function historyCells(record, account, slots) {
  validateRecord(record);
  validateRecord(account);
  if (!Number.isSafeInteger(slots) || slots < 1) throw new Error('Invalid field size');
  if (!record.totalCommits) return { cells: [], daysPerCell: 1 };
  const first = dayNumber(record.firstCommit), last = dayNumber(record.lastCommit);
  const daysPerCell = Math.max(1, Math.ceil((last - first + 1) / slots));
  const start = last - slots * daysPerCell + 1;
  const cells = Array.from({ length: slots }, (_, i) => ({
    start: dateAt(start + i * daysPerCell),
    end: dateAt(start + (i + 1) * daysPerCell - 1),
    count: 0, total: 0,
  }));
  for (const [history, key] of [[record, 'count'], [account, 'total']]) {
    for (const [date, count] of history.daily) {
      const day = dayNumber(date);
      if (day >= start && day <= last) cells[Math.floor((day - start) / daysPerCell)][key] += count;
    }
  }
  if (cells.some(cell => cell.count > cell.total)) throw new Error('Project contributions exceed overall activity');
  return { cells, daysPerCell };
}
