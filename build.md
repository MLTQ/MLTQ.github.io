# build.js

## Purpose
Builds the static archive from the structured ledger, Markdown content, and static assets. Content and navigation remain usable without client JavaScript.

## Components
- `buildIndex` / `leniaMarkup`: assemble the homepage and its progressively enhanced Lenia colony with a green-to-purple density legend and a small reset button inside the stage's bottom-right corner. The canvas is hidden from assistive technology until it is interactive.
- The invitation below the controls links “mathematical life forms” to the original Lenia paper on arXiv.
- `shell`: shared metadata, styles, and document structure. The homepage and project detail pages each load one specimen module.
- `genusNav`: section links on every screen size.
- `loadProjectPages` / `buildProject`: read page content and assemble project details. Optional `media_after_body: true` places the gallery after the prose; the default keeps the gallery first.
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

## Commit history
Every build reloads and validates `content/commit-history.json` before writing output. `commit-field.js` receives both the project and account history, rendering 26 columns on featured index rows and 40 on project pages. Project contributions are highlighted within the matching overall activity interval. Missing or zero-contribution projects omit the field. The dev server restarts when either rendering/model module changes and reloads snapshot data on content changes.
