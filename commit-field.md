# commit-field.js

## Purpose
Render the archive's existing purple commit fields from verified history snapshots. The HTML works offline and without JavaScript.

## Contracts
- Input is a validated project record from `content/commit-history.json`; absent records render nothing. There is no simulated fallback.
- Seven rows, 26 columns on the index and 40 on project pages. Chronology flows down a column, then right. The bottom-right cell includes the last commit date.
- Each non-padding cell has an exact UTC date range and commit-count tooltip. Grey cells mean zero commits; transparent padding precedes project history. Color intensity is relative to the maximum count in that field.
- Captions show totals, first/last dates, the calendar scale, and linked source repositories. The accessible image label explains reading order, counts, dates, and sources.
- CSS compresses columns on narrow screens so the final cell remains visible. No additional canvas, animation, or visitor API requests.

## Validation
`tests/commit-history.test.js` verifies calendar/count preservation and HTML endpoint semantics. Repository mappings and snapshot totals are checked before the site build writes output.
