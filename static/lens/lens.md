# lens/ — static export of the LENS viewer

## Purpose
The interactive Jacobian-lens viewer for Ternary-Bonsai-2-27B from
[MLTQ/Lens](https://github.com/MLTQ/Lens), exported so it runs with no model server. Linked from
`projects/lens.html`.

## Contents
- `index.html`, `volume.js`, `space.js`, `kv.js`, `race.js`, `river.js`, `anatomy.js`: the
  viewer, copied unchanged from `bonsai_lens/static/` except that script paths are relative and
  `static-api.js` loads first.
- `static-api.js`: answers the viewer's `/api/…` requests from `data/`, adds the sentence
  picker, and switches off what needs the live model. Contract in MLTQ/Lens,
  `bonsai_lens/static_site/static-api.md`.
- `data/sentences.json`: the pre-rendered sentences. `data/<slug>/`: every response the views
  request for that sentence. `data/shared/`: the Space maps, atom data, Anatomy textures,
  lens metadata and Space neighbours.

## Contracts
- Generated. Do not edit here: change MLTQ/Lens and re-run
  `scripts/export_static.py data|neighbors|bundle --out <this directory>`.
- All paths are relative to `index.html`; works from `file://` only through a local server
  (the viewer fetches its data).
- Runtime dependency: three.js 0.170 from jsDelivr (import map in `index.html`), as in the
  local viewer. No tracking, no other remote requests.
