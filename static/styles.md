# styles.css

## Purpose
Shared archive typography, navigation, colored genus bands, project rows, and responsive layouts. Preserves the Michroma / Space Mono identity.

## Components
- `.hdr`: introduction and a responsive Lenia specimen, replacing the old mesh graph.
- `.identity` fits the homepage name, with `.sub` distributing the PROJECTS letters evenly beneath it. Responsive heading sizes fit narrow screens; `.sr-only` supplies the intact tagline to assistive technology.
- `.gnav`: visible section navigation, including when graphics or JavaScript are unavailable.
- `.band`, `.row`, `.crow`: existing archive content hierarchy.
- Responsive rules retain readable project pages and avoid horizontal overflow.
- Project gallery images shrink to fit their column but retain their native size when smaller, so low-resolution screenshots are not enlarged. Videos keep their existing full-column sizing.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `build.js` | Existing archive class names and palette variables | Renaming selectors |
| `lenia/lenia.css` | Header grid and shared color variables | Header layout, palette |

## Archive footprints
`.footprint` is a static SVG image, replacing the former CSS rectangle glyphs. Featured marks remain 56px; compact links use 28px marks with a wrapping name beside them. Project-page live specimens and all navigation retain their existing layout.

## Commit fields
`.commit-field` bounds the compact chart width. The seven-row grid uses 26 or 40 columns that compress on narrow screens. Every cell is a real calendar interval, including surrounding GitHub activity. `.hmcap` contains a compact green/purple legend, count comparison, and date range. `.hmkey` uses small colored squares as functional legend markers.
