import { execFile } from 'node:child_process';
import { dayNumber, sumHistory } from '../commit-history.js';

export function request(query, variables) {
  return new Promise((resolve, reject) => {
    const child = execFile('gh', ['api', 'graphql', '--input', '-'], { timeout: 60000, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(new Error(`GitHub request failed (${error.code || 'timeout'}); snapshot unchanged`));
      try {
        const response = JSON.parse(stdout);
        if (response.errors?.length) throw new Error('GitHub returned incomplete data; snapshot unchanged');
        resolve(response.data);
      } catch (e) { reject(e); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify({ query, variables }));
  });
}

const QUERY = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){totalCommitContributions commitContributionsByRepository(maxRepositories:100){repository{nameWithOwner isPrivate} contributions(first:100){totalCount nodes{occurredAt commitCount} pageInfo{hasNextPage}}}}}}`;

/** A month has at most 31 daily nodes. Check totals to detect repository truncation. */
export function readContributions(collection, from, to) {
  if (!collection || !Array.isArray(collection.commitContributionsByRepository)) throw new Error('Missing contribution history');
  const publicRepos = [];
  let total = 0;
  for (const entry of collection.commitContributionsByRepository) {
    const connection = entry.contributions;
    if (!connection || connection.pageInfo?.hasNextPage !== false || !Array.isArray(connection.nodes)) throw new Error('Incomplete contribution days');
    const seen = new Set();
    const daily = connection.nodes.map(node => {
      const date = node.occurredAt.slice(0, 10);
      dayNumber(date);
      if (seen.has(date) || date < from || date > to || !Number.isSafeInteger(node.commitCount) || node.commitCount < 1) throw new Error('Invalid contribution day');
      seen.add(date);
      return [date, node.commitCount];
    });
    const count = daily.reduce((sum, [, n]) => sum + n, 0);
    if (count !== connection.totalCount) throw new Error('Incomplete contribution counts');
    total += count;
    if (entry.repository?.isPrivate === false) publicRepos.push({ repo: entry.repository.nameWithOwner, daily });
    else if (entry.repository?.isPrivate !== true) throw new Error('Unknown contribution visibility');
  }
  if (total !== collection.totalCommitContributions) throw new Error('Incomplete contribution repositories');
  return publicRepos;
}

export async function collectContributions(login) {
  const metadata = await request('query($login:String!){user(login:$login){login contributionsCollection{contributionYears}}}', { login });
  const user = metadata?.user;
  const years = user?.contributionsCollection?.contributionYears;
  if (!Array.isArray(years) || !years.length) throw new Error('Cannot determine GitHub activity range');
  const today = new Date().toISOString().slice(0, 10);
  const months = [];
  for (let year = Math.min(...years); year <= Number(today.slice(0, 4)); year++) {
    for (let month = 1; month <= 12; month++) {
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      if (from > today) break;
      const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
      months.push({ from, to: end < today ? end : today });
    }
  }
  const sources = new Map();
  for (let i = 0; i < months.length; i += 4) {
    const results = await Promise.all(months.slice(i, i + 4).map(async ({ from, to }) => {
      const response = await request(QUERY, { login, from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` });
      return readContributions(response?.user?.contributionsCollection, from, to);
    }));
    for (const entries of results) {
      for (const entry of entries) {
        const key = entry.repo.toLowerCase();
        if (!sources.has(key)) sources.set(key, { repo: entry.repo, daily: [] });
        sources.get(key).daily.push(...entry.daily);
      }
    }
    if (i % 12 === 0) console.log(`Collecting public commit activity: ${months[i].from.slice(0, 7)}`);
  }
  return { account: { login: user.login, ...sumHistory([...sources.values()]) }, sources };
}
