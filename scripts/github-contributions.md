# github-contributions.js

## Purpose
Collect the account owner's full GitHub profile calendar and public project commit contributions. The calendar includes anonymized private activity and non-commit contributions, matching the activity graph on GitHub.

## Contracts
- Query all contribution years in disjoint calendar months. Each connection represents days, but its `totalCount` is commits, not node count.
- Check per-repo counts, collection totals, duplicate dates, range bounds, and pagination. Truncated results fail rather than produce an incomplete chart.
- Four independent requests at a time. Credentials stay with the authenticated GitHub CLI, never in source or output.
- Background: use `contributionCalendar` daily totals, including private activity and all contribution types GitHub includes on the profile. Validate exact calendar coverage and totals.
- Project highlights: use public per-repository commit contributions credited to this account. Discard private repository entries; persist no private identities or contents.
- Preserve the contribution date supplied by GitHub; do not mix it with committer timestamps from raw Git history.
- `readContributions` and `readCalendar` are pure and tested for private-only activity, complete coverage, count mismatches, and invalid dates.

Source: [GitHub commit contribution schema](https://docs.github.com/en/graphql/reference/commits), `CommitContributionsByRepository` and `CreatedCommitContributionConnection`.

[GitHub profile contribution reference](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference) explains contribution types and anonymized private counts. The calendar provides aggregate counts without private repository identities.
