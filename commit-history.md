# commit-history.js

## Purpose
Pure counting and calendar rules for repository history. No network requests, local paths, or wall-clock date affect rendering.

## Components
- `historyRepos`: selects explicit grouped repositories, otherwise the project's source repo.
- `aggregateHistory`: counts each reachable SHA once across a project's repositories, using its committer timestamp in UTC. Stores daily totals, date bounds, and source branch/head provenance; does not persist commit messages, authors, or email addresses.
- `validateRecord` / `validateSnapshot`: reject inconsistent counts, dates, and stale repository mappings.
- `historyCells`: fits the entire first-to-last-commit interval into a bounded grid. Bins end at the last commit; early unused slots are padding, not zero-commit dates. Empty days inside the interval remain real zeroes.

## Contracts
`scripts/refresh-commit-history.js` collects every commit reachable from each public repository's pinned default-branch head, including merges. `commit-field.js` renders those counts. Grouped repos deduplicate shared SHAs. The final cell always ends on the final commit date and contains at least one commit for a nonempty history.

Long histories use uniform multi-day bins, except the possibly shorter first bin. All commits count exactly once. Short histories use one UTC day per cell. Empty repos have no date bounds.
