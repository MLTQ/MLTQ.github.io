# projects.js

## Purpose
The archive's project ledger. Supplies the index, project routes, section membership, summaries, and fallback field notes. Page-specific prose and media belong in `projects/<slug>.md`.

## Contracts
- Slugs are unique and stable; they determine project URLs and page Markdown filenames.
- `genus` matches an ID in `site.js`; ledger order determines order within a section.
- `featured` chooses the full or compact index row. Both receive a complete project page.
- `repo: null` omits the source repository link. Optional `heat` data produces a commit field; omit it when none is provided.
- Each project needs a permanent, unique species in `lenia.js`, used for its live detail-page specimen and static index footprint.
- Legacy `glyph` data remains for older consumers; the current index uses the species footprint.

## Content notes
Rubbed Gong is filed under PHONICA with a compact row and an initial CYCLING status. Its description and field notes come from the owner's screenshot; no source repository or activity history was supplied. Its image is preserved in `static/media/gong/`.
