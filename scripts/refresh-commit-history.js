#!/usr/bin/env node
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import projects from '../content/projects.js';
import { aggregateHistory, historyRepos, validateSnapshot } from '../commit-history.js';

const destination = new URL('../content/commit-history.json', import.meta.url);
const META = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){nameWithOwner isPrivate defaultBranchRef{name target{... on Commit{oid}}}}}`;
const HISTORY = `query($owner:String!,$name:String!,$head:String!,$cursor:String){repository(owner:$owner,name:$name){object(expression:$head){... on Commit{history(first:100,after:$cursor){totalCount nodes{oid committedDate} pageInfo{hasNextPage endCursor}}}}}}`;

function request(query, variables) {
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

async function collect(repo) {
  const [owner, name] = repo.split('/');
  const metadata = (await request(META, { owner, name }))?.repository;
  if (!metadata || metadata.isPrivate) throw new Error(`History source must be a verified public repository: ${repo}`);
  const branch = metadata.defaultBranchRef?.name ?? null;
  const head = metadata.defaultBranchRef?.target?.oid ?? null;
  const source = { repo: metadata.nameWithOwner, branch, head, commits: [] };
  if (!head) return source;
  let cursor = null, expected;
  const seen = new Set(), cursors = new Set();
  do {
    const response = await request(HISTORY, { owner, name, head, cursor });
    const history = response?.repository?.object?.history;
    if (!history || !Array.isArray(history.nodes)) throw new Error(`Incomplete history: ${repo}`);
    expected ??= history.totalCount;
    if (history.totalCount !== expected) throw new Error(`History changed while collecting pinned head: ${repo}`);
    for (const commit of history.nodes) {
      if (!commit || seen.has(commit.oid)) throw new Error(`Repeated or missing commit: ${repo}`);
      seen.add(commit.oid);
      source.commits.push(commit);
    }
    cursor = history.pageInfo.hasNextPage ? history.pageInfo.endCursor : null;
    if (history.pageInfo.hasNextPage && (!cursor || cursors.has(cursor))) throw new Error(`Invalid pagination: ${repo}`);
    if (cursor) cursors.add(cursor);
  } while (cursor);
  if (source.commits.length !== expected) throw new Error(`Partial history: ${repo}`);
  console.log(`${source.repo}: ${source.commits.length} commits (${branch})`);
  return source;
}

async function refresh() {
  const repos = [...new Set(projects.flatMap(historyRepos))];
  const sources = new Map();
  // Four small metadata/history requests at a time, with sequential pagination per repo.
  for (let i = 0; i < repos.length; i += 4) {
    const results = await Promise.all(repos.slice(i, i + 4).map(async repo => [repo, await collect(repo)]));
    for (const [repo, source] of results) sources.set(repo, source);
  }
  const snapshot = { version: 1, calendar: 'UTC', refreshedAt: new Date().toISOString(), projects: {} };
  for (const project of projects) {
    const selected = historyRepos(project);
    if (selected.length) snapshot.projects[project.slug] = aggregateHistory(selected.map(repo => sources.get(repo)));
  }
  validateSnapshot(snapshot, projects);
  const temporary = new URL(`../content/.commit-history-${process.pid}.tmp`, import.meta.url);
  try {
    await fs.writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
    await fs.rename(temporary, destination);
  } finally { await fs.rm(temporary, { force: true }); }
  console.log(`Saved complete history for ${Object.keys(snapshot.projects).length} projects. No simulated counts.`);
}

refresh().catch(error => { console.error(error.message); process.exitCode = 1; });
