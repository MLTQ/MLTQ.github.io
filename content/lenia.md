# lenia.js

## Purpose
Permanent project-to-species assignments for all 27 archive projects. Each record is an unmodified single-channel species from Bert Chan's original Lenia catalog, with its own seed and kernel/growth parameters. The homepage keeps its Orbium colony.

## Provenance
- https://github.com/Chakazul/Lenia/blob/master/Python/animals.json (retrieved 2026-09-05)
- Copyright (c) 2018 Bert Chan; MIT license retained in `static/lenia/LICENSE.txt`.
- Parameters and RLE were copied intact. All selected species use polynomial kernel/growth and survived 1,000 steps in a 96² periodic numerical check before integration.
- Physical Gong Sim uses `3ECv`, Circoechinium ventilans, from the same previously checked catalog. Existing assignments are preserved.

## Contracts
`project-lenia.js` embeds only the requested project's record. Each slug and species code must be unique. Preserve assignments when adding/reordering projects: these also define the archive's static 2D footprints. Do not assign by list position or randomly per visit.
