# refresh-commit-history.js

## Purpose
Refresh the static account history and project highlight snapshot. Uses the account in `content/site.js` and verified public repository mappings from `content/projects.js`.

## Contracts
- Confirm each selected project repository is public, then call `github-contributions.js` for the full account history.
- Use GitHub's own commit contribution counts for both layers; exclude other activity types, private entries, and commits not credited to the account.
- Combined projects sum their selected repositories using the same accounting as the overall GitHub history.
- Atomically replace `content/commit-history.json` only after all queries, totals, dates, and project subsets validate. Failure leaves the prior snapshot intact.
- GitHub CLI handles authentication. CI supplies ephemeral `GH_TOKEN`; credentials never reach site assets or logs.
- `npm run history:refresh` runs manually and before Pages deployment. Ordinary builds remain offline, with no visitor API requests.
