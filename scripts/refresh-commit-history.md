# refresh-commit-history.js

## Purpose
Refreshes the static commit-count snapshot from GitHub using the existing authenticated `gh` CLI. Run `npm run history:refresh` locally; the Pages workflow also runs it before building.

## Contracts
- Only explicit project repo mappings are queried. Private or missing repositories fail closed.
- Pin each repository's default-branch SHA before paging through its complete reachable history. Retrieve only SHA and committer timestamp, and validate the API's total count.
- Include merge commits and all authors; shared SHAs in a combined project count once.
- Write only aggregate UTC daily counts and public source provenance to `content/commit-history.json`.
- Update atomically after every repository succeeds. API failures and incomplete pagination leave the previous snapshot intact and fail the command.
- `GH_TOKEN` may be supplied by CI. Tokens remain in the CLI's existing credential handling or environment; none are written to source or output.
- Normal `npm run build` is offline and reads the saved snapshot. No API calls or credentials reach visitors.

## Sources
GitHub GraphQL `Repository.defaultBranchRef`, pinned `Repository.object`, and `Commit.history`. Pagination has no date cutoff, so dormant projects retain their full history.
