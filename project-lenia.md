# project-lenia.js

## Purpose
Builds a project's compact living specimen in the old header-sigil position. Includes one canvas, scoped controls, a paper link, and an actual seed-density fallback.

## Components
- `projectLeniaMarkup(slug)`: looks up the stable species; throws on missing assignments. Embeds only that species as inert JSON, plus the shared runtime module.
- `still`: renders a data-driven SVG density map from the same RLE. This is a no-WebGPU fallback on detail pages; archive footprints are generated separately by `lenia-footprint.js`.

## Contracts
`build.js` calls once per project page, and loads `lenia.css`. The DOM matches `static/lenia/index.js`. Each document contains at most one `data-lenia` root. JSON escapes `<`; project names are HTML-escaped. Relative URLs assume project pages are one directory deep.
