# refresh-commit-history.js

## Purpose
Refresh the static account history and project highlight snapshot. Uses the account in `content/site.js` and verified public repository mappings from `content/projects.js`.

## Contracts
- Confirm each selected project repository is public, then call `github-contributions.js` for the full account history.
- Use the full profile calendar for overall activity, including anonymous private counts. Project highlights remain public commit contributions credited to this account.
- Keep separate metric names: `account.totalContributions` and `projects[slug].totalCommits`. Never label the full calendar as commits.
- Combined projects sum their selected public repositories; every project count must be a subset of the matching calendar day.
- Atomically replace `content/commit-history.json` only after all queries, totals, dates, and project subsets validate. Failure leaves the prior snapshot intact.
- GitHub CLI handles authentication. CI supplies ephemeral `GH_TOKEN`; credentials never reach site assets or logs.
- `npm run history:refresh` runs manually and before Pages deployment. Ordinary builds remain offline, with no visitor API requests.
