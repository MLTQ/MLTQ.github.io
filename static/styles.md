# styles.css

## Purpose
Shared archive typography, navigation, colored genus bands, project rows, and responsive layouts. Preserves the Michroma / Space Mono identity.

## Components
- `.hdr`: introduction and a responsive Lenia specimen, replacing the old mesh graph.
- `.gnav`: visible section navigation, including when graphics or JavaScript are unavailable.
- `.band`, `.row`, `.crow`: existing archive content hierarchy.
- Responsive rules retain readable project pages and avoid horizontal overflow.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `build.js` | Existing archive class names and palette variables | Renaming selectors |
| `lenia/lenia.css` | Header grid and shared color variables | Header layout, palette |

## Archive footprints
`.footprint` is a static SVG image, replacing the former CSS rectangle glyphs. Featured marks remain 56px; compact links use 28px marks with a wrapping name beside them. Project-page live specimens and all navigation retain their existing layout.
