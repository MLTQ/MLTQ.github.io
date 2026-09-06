# commit-field.js

## Purpose
Render compact GitHub activity fields with the current project's contribution days highlighted in purple. Static HTML works offline, without browser JavaScript or API access.

## Contracts
- Takes a validated project record, account history, and layout options. Missing or zero-contribution projects render nothing.
- Seven rows, 26 columns on the index and 40 on detail pages. Chronology flows down each column, then right, ending at the owner's last project contribution.
- Green cells show the full GitHub profile contribution calendar, including anonymized private activity; purple cells highlight bins containing project commits. Grey means no contributions on the profile calendar. Logarithmic intensity keeps small counts legible; each layer normalizes to its own maximum.
- Purple bins can also contain other work. Exact tooltips distinguish project commits, total contributions, and other contributions. Other contributions can include non-commit activity in this same project, so they are never labeled “elsewhere.”
- Caption includes a two-color legend, separately labeled commit/contribution counts, and actual date range. The accessible image label explains anonymized private activity, reading order, calendar scale, and public project repositories.
- Narrow screens compress the columns to retain the final pixel. No additional live graphics or requests.

## Validation
`tests/commit-history.test.js` checks contribution accounting, contextual windows, colors, final pixels, exact shares, and every saved record.
