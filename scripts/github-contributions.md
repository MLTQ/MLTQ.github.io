# github-contributions.js

## Purpose
Collect the account owner's public commit contributions, including contributions to repositories outside the portfolio. Uses GitHub's own calendar and attribution rules so the project layer is a true subset of overall activity.

## Contracts
- Query all contribution years in disjoint calendar months. Each connection represents days, but its `totalCount` is commits, not node count.
- Check per-repo counts, collection totals, duplicate dates, range bounds, and pagination. Truncated results fail rather than produce an incomplete chart.
- Four independent requests at a time. Credentials stay with the authenticated GitHub CLI, never in source or output.
- Discard private repository entries before accumulation. Exclude issues, reviews, pull requests, and collaborators' commits.
- Preserve the contribution date supplied by GitHub; do not mix it with committer timestamps from raw Git history.
- `readContributions` is pure and tested with public/private and incomplete fixtures.

Source: [GitHub commit contribution schema](https://docs.github.com/en/graphql/reference/commits), `CommitContributionsByRepository` and `CreatedCommitContributionConnection`.
