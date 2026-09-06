# commit-field.js

## Purpose
Render compact GitHub activity fields with the current project's contribution days highlighted in purple. Static HTML works offline, without browser JavaScript or API access.

## Contracts
- Takes a validated project record, account history, and layout options. Missing or zero-contribution projects render nothing.
- Seven rows, 26 columns on the index and 40 on detail pages. Chronology flows down each column, then right, ending at the owner's last project contribution.
- Green cells show surrounding GitHub commit activity; purple cells highlight bins containing project commits. Grey means no public commit contributions. Logarithmic intensity keeps small counts legible; each layer normalizes to its own maximum.
- Purple bins can also contain other work. Exact tooltips show project, total, and other counts; the caption states the project share of the displayed period.
- Caption includes a two-color legend, count comparison, and actual date range. The accessible image label explains public scope, reading order, calendar scale, and project repositories.
- Narrow screens compress the columns to retain the final pixel. No additional live graphics or requests.

## Validation
`tests/commit-history.test.js` checks contribution accounting, contextual windows, colors, final pixels, exact shares, and every saved record.
