# commit-history.test.js

## Purpose
Verify that project highlights are an accurate subset of the owner's full GitHub profile calendar, across short and multi-year projects.

## Cases
Contribution-day parsing, private entry filtering, total and pagination failures, duplicate dates, leap days, complete contextual windows, exact project/background interval totals, grouped repositories, final pixel alignment, mapping changes, color separation, precise tooltip shares, private-only calendar activity, complete calendar coverage, separate commit/contribution labels, and every saved project at both chart sizes.

Run `npm run test:history`. Deterministic fixtures and the checked-in snapshot require no network access or Lenia evolution.
