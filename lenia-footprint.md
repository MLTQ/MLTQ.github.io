# lenia-footprint.js

## Purpose
Produces static top-down footprints directly from each assigned Lenia seed. Reuses the jelly renderer's cubic B-spline density interpolation and its 0.045 midplane boundary, retaining both outer lobes and interior holes.

## Components
- `footprintGeometry(species)`: samples at four points per cell axis, traces triangle isocontours into closed loops, and fits them into a padded square viewBox. Throws on empty/open geometry.
- `footprintSVG(species)`: one flat periwinkle SVG path with even-odd filling. A scientific density contour, not an invented illustration or a rendered 3D screenshot.
- Path simplification limits deviation to 0.03 cells and keeps each loop's area within 1%; tiny loops fall back to the original contour. This reduces image transfer size without filling holes or adding runtime work.

## Contracts
`build.js` generates one cached image asset per project under `dist/lenia/footprints/`. Featured and compact archive links load those images at different sizes. No runtime JavaScript, canvas, WebGPU, or animation is added. Assignments remain in `content/lenia.js`, shared with project-page creatures.
