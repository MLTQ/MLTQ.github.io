# build.js

## Purpose
Builds the static archive from the structured ledger, Markdown content, and static assets. Content and navigation remain usable without client JavaScript.

## Components
- `buildIndex` / `leniaMarkup`: assemble the homepage and its progressively enhanced Lenia colony with a green-to-purple density legend and a small reset button inside the stage's bottom-right corner. The canvas is hidden from assistive technology until it is interactive.
- The invitation below the controls links “mathematical life forms” to the original Lenia paper on arXiv.
- `shell`: shared metadata, styles, and document structure. The homepage and project detail pages each load one specimen module.
- `genusNav`: section links on every screen size.
- `build`: validates content, emits pages and discovery files, copies assets, and reconciles output.
- `serve`: serves `dist` and watches source; JavaScript modules need a JavaScript MIME type.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| GitHub Pages workflow | `node build.js` emits complete `dist/` | Output path, runtime dependencies |
| Content authors | Existing Markdown and ledger formats | Content schema |
| `static/lenia/index.js` | Homepage specimen DOM from `leniaMarkup()` | Selectors, controls |

## Notes
Never edit generated `dist` files. Project detail headers call `projectLeniaMarkup` once; archive-list marks are static footprints of the same assigned species.

## Archive footprints
`footprintSVG` generates one static asset per project from its assigned Lenia seed during the build. `footprint` inserts decorative image tags in featured and compact project links. Assets are registered through `write` so output cleanup preserves them. No additional live surfaces are added.
