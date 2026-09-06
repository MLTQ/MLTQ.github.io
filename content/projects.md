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
Physical Gong Sim is filed under PHONICA with a compact row and an initial CYCLING status. The owner supplied its name; its description and field notes come from the owner's screenshot. No source repository or activity history was supplied. Its stable slug is `gong`, and its image is preserved in `static/media/gong/`.

The LENIA entry combines the distinct Lenia-Rust and Lenia-3D repositories on one page, at the existing `lenia-3d` URL. Its page Markdown separates their descriptions, original screenshots, and source links. It keeps the existing single live creature and index footprint.

NEUROVEIL is the public name of the Synchroflow project; its `synchroflow` URL and species assignment remain stable. Its page credits the team and Rui Ma's film, and uses the organizer's verified awards: the Qualcomm AI win and third place in the OpenBCI category. Team spelling follows the owner's supplied names.
