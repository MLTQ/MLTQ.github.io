import { historyCells } from './commit-history.js';

const PALETTE = ['#dfe0e3', '#c9cce9', '#a3a8de', '#8f93d9', '#5f64b4'];
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plural = count => `${count.toLocaleString('en-US')} commit${count === 1 ? '' : 's'}`;
const range = (start, end) => start === end ? start : `${start} — ${end}`;

/** Build-time HTML only: visitors need neither JavaScript nor GitHub access. */
export function renderCommitField(record, { columns = 26, large = false } = {}) {
  if (!record) return '';
  if (!Number.isSafeInteger(columns) || columns < 1) throw new Error('Invalid commit field columns');
  const { cells, daysPerCell } = historyCells(record, columns * 7);
  const maximum = Math.max(1, ...cells.map(cell => cell?.count ?? 0));
  const scale = `${daysPerCell} day${daysPerCell === 1 ? '' : 's'} / pixel · UTC`;
  const dates = record.totalCommits ? range(record.firstCommit, record.lastCommit) : 'No commits yet';
  const sources = record.repositories.map(source => `<a href="https://github.com/${esc(source.repo)}" title="${esc(`Default branch: ${source.branch ?? 'none'}`)}">${esc(source.repo)}</a>`).join(' + ');
  const label = `${plural(record.totalCommits)}. Full history, ${dates}. ${scale}. `
    + 'Read top to bottom, then left to right. Darker pixels mean more commits; blank space precedes the first commit. '
    + `Sources: ${record.repositories.map(source => `${source.repo} (${source.branch ?? 'empty'})`).join(', ')}.`;
  const pixels = cells.map(cell => {
    if (!cell) return '<div class="hm-padding" aria-hidden="true"></div>';
    const level = cell.count ? Math.max(1, Math.ceil(cell.count / maximum * 4)) : 0;
    return `<div style="background:${PALETTE[level]}" title="${esc(`${range(cell.start, cell.end)} UTC: ${plural(cell.count)}`)}" data-start="${cell.start}" data-end="${cell.end}" data-count="${cell.count}"></div>`;
  }).join('');
  // Keep the established footprint; narrow screens compress columns to show the final pixel.
  const width = columns * (large ? 9 : 7) + (columns - 1) * (large ? 2.5 : 2);
  return `<figure class="commit-field" style="--history-columns:${columns};--history-width:${width}px">
<div class="hm${large ? ' hm-lg' : ''}" role="img" aria-label="${esc(label)}">${pixels}</div>
<figcaption class="hmcap"><span>${plural(record.totalCommits)} · full history</span><span>${dates}</span><span title="Counts include all authors and merge commits on the default branch. Shared commits in combined repositories count once. Each field has its own color scale.">${scale}</span><span>${sources}</span></figcaption>
</figure>`;
}
