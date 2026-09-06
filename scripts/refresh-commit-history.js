#!/usr/bin/env node
import fs from 'node:fs/promises';
import projects from '../content/projects.js';
import site from '../content/site.js';
import { sumHistory, historyRepos, validateSnapshot } from '../commit-history.js';
import { collectContributions, request } from './github-contributions.js';

const destination = new URL('../content/commit-history.json', import.meta.url);
const META = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){nameWithOwner isPrivate}}`;

async function refresh() {
  const login = new URL(site.github).pathname.split('/').filter(Boolean)[0];
  if (!/^[\w-]+$/.test(login ?? '')) throw new Error('Invalid GitHub account');
  const repos = [...new Set(projects.flatMap(historyRepos))];
  const verified = new Map();
  for (let i = 0; i < repos.length; i += 4) {
    const results = await Promise.all(repos.slice(i, i + 4).map(async repo => {
      const [owner, name] = repo.split('/');
      const metadata = (await request(META, { owner, name }))?.repository;
      if (!metadata || metadata.isPrivate) throw new Error(`History source must be a verified public repository: ${repo}`);
      return [repo, metadata.nameWithOwner];
    }));
    for (const [repo, canonical] of results) verified.set(repo, canonical);
  }
  const { account, sources } = await collectContributions(login);
  const snapshot = {
    version: 2, calendar: 'GitHub contribution days', scope: 'public commit contributions',
    refreshedAt: new Date().toISOString(), account, projects: {},
  };
  for (const project of projects) {
    const selected = historyRepos(project).map(repo => verified.get(repo));
    if (!selected.length) continue;
    snapshot.projects[project.slug] = {
      repositories: selected.map(repo => ({ repo })),
      ...sumHistory(selected.map(repo => sources.get(repo.toLowerCase()) ?? { daily: [] })),
    };
  }
  validateSnapshot(snapshot, projects);
  const temporary = new URL(`../content/.commit-history-${process.pid}.tmp`, import.meta.url);
  try {
    await fs.writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
    await fs.rename(temporary, destination);
  } finally { await fs.rm(temporary, { force: true }); }
  console.log(`Saved ${account.totalCommits} public commit contributions and ${Object.keys(snapshot.projects).length} project highlights for ${account.login}.`);
}

refresh().catch(error => { console.error(error.message); process.exitCode = 1; });
