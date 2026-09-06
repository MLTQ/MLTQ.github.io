import { historyCells } from './commit-history.js';

const EMPTY = '#dfe3df';
const OVERALL = ['#cedfd4', '#b2cbbc', '#91b29d', '#6d977c'];
const PROJECT = ['#b9aad9', '#a089cd', '#8364b6', '#613f95'];
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const number = count => count.toLocaleString('en-US');
const range = (start, end) => start === end ? start : `${start} — ${end}`;
const shade = (count, maximum, palette) => palette[Math.min(3, Math.ceil(Math.log1p(count) / Math.log1p(maximum) * 4) - 1)];

/** Build-time HTML only: project commits highlighted within the owner's GitHub activity. */
export function renderCommitField(record, account, { columns = 26, large = false } = {}) {
  if (!record?.totalCommits) return '';
  if (!Number.isSafeInteger(columns) || columns < 1) throw new Error('Invalid commit field columns');
  const { cells, daysPerCell } = historyCells(record, account, columns * 7);
  const maximum = Math.max(1, ...cells.map(cell => cell.total));
  const projectMaximum = Math.max(1, ...cells.map(cell => cell.count));
  const total = cells.reduce((sum, cell) => sum + cell.total, 0);
  const scale = `${daysPerCell} day${daysPerCell === 1 ? '' : 's'} per pixel, using GitHub contribution dates`;
  const dates = range(cells[0].start, cells.at(-1).end);
  const sources = record.repositories.map(source => source.repo).join(' + ');
  const label = `${account.login}'s GitHub contribution calendar, including anonymized private activity, ${dates}. `
    + `${number(record.totalCommits)} project commits within ${number(total)} total contributions. ${scale}. `
    + 'Read top to bottom, then left to right. Green shows overall activity; purple highlights days with project commits. '
    + `Darker colors mean more commits. Project: ${sources}.`;
  const pixels = cells.map(cell => {
    const color = cell.count ? shade(cell.count, projectMaximum, PROJECT) : cell.total ? shade(cell.total, maximum, OVERALL) : EMPTY;
    const title = `${range(cell.start, cell.end)}: ${number(cell.count)} project commits; ${number(cell.total)} total contributions; ${number(cell.total - cell.count)} other contributions`;
    return `<div style="background:${color}" title="${esc(title)}" data-start="${cell.start}" data-end="${cell.end}" data-count="${cell.count}" data-total="${cell.total}"></div>`;
  }).join('');
  const width = columns * (large ? 9 : 7) + (columns - 1) * (large ? 2.5 : 2);
  return `<figure class="commit-field" style="--history-columns:${columns};--history-width:${width}px">
<div class="hm${large ? ' hm-lg' : ''}" role="img" aria-label="${esc(label)}">${pixels}</div>
<figcaption class="hmcap">
<span class="hmlegend"><a class="hmkey hmkey-github" href="https://github.com/${esc(account.login)}" title="${esc(account.login)}'s full contribution calendar, including anonymized private activity">GitHub</a><span class="hmkey hmkey-project" title="Commits to ${esc(sources)}">This project</span></span>
<span>${number(record.totalCommits)} commits · ${number(total)} contributions</span>
<span title="${esc(scale)}">${dates}</span>
</figcaption>
</figure>`;
}
