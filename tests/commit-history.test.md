# commit-history.test.js

## Purpose
Check that displayed history preserves real commit counts and calendar intervals, including dormant projects and grouped repositories.

## Cases
UTC conversion, leap days, shared SHA deduplication, quiet periods, single-day projects, multi-year compression, no overlapping or missing days, total conservation, exact final pixel, malformed snapshots, mapping changes, accessible source labels, and both rendered sizes against every saved project.

Run `npm run test:history`. Tests use deterministic fixtures plus the saved snapshot; they make no network requests and do not evolve the unrelated Lenia simulations.
