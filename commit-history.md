# commit-history.js

## Purpose
Pure aggregation, validation, and calendar rules for project contributions shown inside the owner's wider GitHub activity.

## Components
- `historyRepos`: explicit grouped repositories, otherwise the project's source repo.
- `sumHistory`: aggregate daily counts with explicit `commits` or `contributions` metrics; these produce distinct total/date property names.
- `validateRecord` / `validateSnapshot`: reject invalid totals, dates, changed mappings, or a project's daily count exceeding the overall count.
- `historyCells`: include the project's entire contribution history, with at least one day per cell. Fill the rest of the fixed field with real surrounding activity; no transparent padding or invented counts.

## Contracts
Snapshot version 3 uses the full GitHub profile calendar for the background, including anonymized private activity and non-commit contributions. Project highlights use public commit contributions credited to the same account. Both use GitHub's contribution dates, not raw committer timestamps. Overall and project layers use identical date bins. The final pixel ends at the owner's last contribution to that project. Short projects show 182 days on the index and 280 on detail pages; longer histories use uniform multi-day bins covering every project contribution.

Each cell stores its date range, project count, and overall count. Background counts outside the visible interval are excluded. Empty project records render no field. No clock input affects rendering.
