# MLTQ Archive

Personal showcase and field log. A static site built by a small Node script
from a folder of plain content files. **No dependencies and no framework.** The archive content and commit fields
are rendered at build time. The homepage progressively enhances its header
with a WebGPU Lenia colony rendered as refractive green-to-purple jelly.
Each project detail page has one distinct Lenia species in place of its header sigil.

```bash
node build.js             # build once -> dist/
node build.js --serve     # build, serve dist/ on :8000, rebuild on save
node build.js --scaffold  # create page files for any systems missing one
```

`npm run build` / `npm run dev` do the same. Node 18+. There is nothing to
install.

## Layout

```
content/site.js         site metadata, genera, the CHRONICA log, the domain
content/projects.js     the ledger — index rows, statuses and cross-filing
content/lenia.js         permanent project-to-species assignments and original seeds
content/projects/*.md   one page per system: its prose, stats and media
content/posts/*.md      long-form writing (SCRIPTA)
static/                 copied verbatim into dist/ (styles, favicon, media, Lenia)
static/lenia/           isolated WebGPU simulation, glass renderer and still fallback
tests/lenia.test.js     independent CPU longevity and locomotion check
build.js                the generator
project-lenia.js         single-specimen headers and seed-density fallbacks
spectrogram.js          build-time FFT waterfalls for audio
dist/                   output — generated, gitignored, never edited by hand
```

**The split matters.** `projects.js` holds the structured facts that appear in
more than one place — name, genus, status, commit field, cross-filing.
`content/projects/<slug>.md` holds everything that appears only on that
system's own page. You write prose in Markdown; you never edit generated HTML,
and you never write a paragraph inside a JS string literal.

The build emits `index.html`, `writing.html`, `chronica.html`, `404.html`,
`robots.txt`, a page per system under `projects/`, a page per post under
`writing/`, and (once a domain is set) `CNAME`, `sitemap.xml` and `feed.xml`.

Every internal link is relative, so `dist/` works unchanged from `file://`,
from a GitHub Pages project subpath, or from a custom domain.

## Living header colony

The former mesh graph is replaced by **Orbium unicaudatus**, the original
MIT-licensed O2u Lenia glider by [Bert Chan](https://github.com/Chakazul/Lenia).
Section links remain available beside it on desktop and above it on phones.

- Native WebGPU compute evolves a shared 160 × 112 torus with the source specimen's
  exact polynomial kernel and growth rules (R=13, T=10, μ=.15, σ=.015).
- Six small gliders begin at varied positions with random continuous headings.
  They move at 16 evolution steps per second, 60% slower than the original header.
  The fixed camera fits the whole habitat; gliders can meet and collide.
- A GPU reduction measures occupancy about once per simulation second. When
  every cell is zero, 3–7 new gliders spawn with fresh positions and directions.
  Reset also randomizes the colony; stale readbacks cannot overwrite a reset.
- The material raymarches a smooth 3D volume derived from the 2D cell density:
  entry/exit refraction, thickness-dependent absorption, studio highlights
  and soft shadows. Color follows cell state A: green at low density and purple
  at high density. This is separate from the Lenia-3D project.
- Drag to stretch the rendering and release to let the damped spring settle.
  Arrow keys nudge; space toggles play. Pause and Reset have ordinary buttons.
- Reduced-motion visitors start paused. Offscreen specimens and hidden tabs
  suspend GPU work. Rendering is capped around 30 fps and at 1.5× pixel density.
- Unsupported browsers, device loss and script failures leave a local SVG
  illustration. All archive navigation and content remain functional.

No third-party runtime code, remote textures, or tracking is added. The MIT
notice is in `static/lenia/LICENSE.txt`. Module companion documents describe
the rendering and simulation contracts. Run the numerical regression with
`node --test tests/*.test.js`; use `npm run dev` to test the live WebGPU
renderer (HTTPS or localhost is required by WebGPU). The isolated browser
regression harness in `tests/browser.html` / `tests/browser.js` checks real GPU
empty-field reseeding, a faint surviving cell, and reset/readback races; it is
never included in the published output.

## Project creatures

All 26 projects have different, stable assignments from Bert Chan's original
catalog. Only the selected species is embedded on each page, with one WebGPU
canvas and a 96 × 96 simulation. Its original seed, polynomial growth parameters,
and multi-ring kernel are preserved. A toroidal tracking camera follows its
motion without modifying the cells. Reset and extinction restore one creature
of that same species.

Archive marks are static top-down SVG footprints traced from those same seeds.
They preserve the original periwinkle color and need no extra GPU work.

Project drawing width is capped at 480 pixels, with the same 30 fps limit,
offscreen suspension, reduced-motion support, and device cleanup as the homepage.
Unsupported views display a density map of the assigned seed. The assignments in
`content/lenia.js` drive both footprints and project creatures; extend them when adding projects.

Run `npm run build` before `node --test tests/*.test.js`. The isolated
`tests/species-browser.js` harness checks all species with actual GPU evolution,
reset, and same-species extinction recovery; see its companion document for setup.

## Adding a system

One object in `content/projects.js`. Order within a genus is the order shown.

```js
{
  slug: 'lantern',              // -> projects/lantern.html
  name: 'LANTERN',
  genus: 'optica',              // an id from site.js
  status: 'SEED',               // ACTIVE | SHIPPED | CYCLING | DORMANT | SEED
  featured: false,              // true = full index row; both get a full page
  repo: 'MLTQ/lantern',         // or null
  summary: 'One sentence.',
  log: [{ date: '2026.09.01', text: 'first light' }],  // date optional
  tags: ['Optics'],
}
```

From that the build derives the index row, the page, the genus count in the
band, the previous/next links on its neighbours, and the
sitemap entry. Nothing is written twice.

`cross: ['retia']` cross-files a system into a second genus and lists it
under that genus's bridges. `mesh: true`
appends `· ON THE MESH` to its status.

Run `npm run history:refresh` after adding a verified repository, then
`node build.js --scaffold` to create its page file.

### Footprints

Assign an original Lenia species to the new slug in `content/lenia.js`. The build
traces its density boundary into a static SVG under `dist/lenia/footprints/`.
Featured rows use 56px marks and compact rows use 28px marks; both correspond to
the single live creature on that project's page. Legacy `glyph` fields in older
ledger records are no longer rendered.

### Commit fields

Every field comes from the full GitHub history of the project's public default
branch, including merges and all authors. Dates use the committer timestamp in
UTC. Nothing is simulated. The fixed grid ends on the last commit date, rather
than today: read down each column, then left to right. The bottom-right pixel
always includes the final commit.

Short histories use one day per pixel. Long histories use equal multi-day bins
(the first can be shorter), preserving every commit and quiet day between the
first and last commit. Unused space on the left is transparent padding, not
invented dates. Captions show the complete date range, total count, days per
pixel, and source repos. Hover a pixel for its exact date range and count. Color
intensity is relative to the busiest pixel in each field.

`repo` supplies the history source by default. For a page covering multiple
repos, set `historyRepos: ['MLTQ/first', 'MLTQ/second']`; shared SHAs count once.
Bonsai combines Neural-Cellular-Automatar and Bonsai, and LENIA combines
Lenia-Rust and Lenia-3d. Projects without a verified repo have no field.

After adding or changing a repository mapping, refresh using the authenticated
GitHub CLI, then build:

```sh
npm run history:refresh
npm run test:history
npm run build
```

The collector pins each default-branch head, retrieves all history pages, checks
the reported total, and atomically saves aggregate daily counts and source
provenance to `content/commit-history.json`. Failed or incomplete requests leave
the previous snapshot intact. Commit messages and personal author information
are not stored. The GitHub Pages workflow refreshes on each deployment; ordinary
local builds use the checked-in snapshot offline. Visitors make no GitHub calls.

## Writing a project page

Each system has a file at `content/projects/<slug>.md`. This is the one you
open to add commentary, write up a result, or log what happened this week.
`--scaffold` creates any that are missing and never touches one that exists.

```markdown
---
stats:
  23.4 dB | ONE-SHOT ENCODER, HELD-OUT
  ~600 KB | 64-FRAME WINDOW ON DISK
media:
  avenue_fit.gif | ground truth vs reconstruction
  slot | drop: prior_sample_v1.gif — real fit | generated
links:
  Design notes | https://example.com
---

## 2026.09.01 — WHAT HAPPENED

Ordinary Markdown from here down. A `##` heading becomes a dated section;
newest at the top reads best.
```

The rules:

- **Body empty → the page falls back** to the `log` lines from `projects.js`,
  rendered as FIELD NOTES. Write anything real and it takes over. That way the
  index row and the page can never quietly disagree.
- **Frontmatter is optional.** `stats` (up to 4 cards), `media` and `links` are
  indented lists, one per line, split on the first `|`. Later pipes stay in the
  right-hand side, so captions may contain them.
- **`media`** takes one file per line — see below.
- **HTML comments are dropped**, so `<!-- todo -->` never ships, and a body of
  nothing but comments still counts as empty.
- A `.md` whose name matches no project **fails the build** rather than sitting
  there silently never rendering.

`content/projects/jewels.md` is the worked example.

To attach a full blog post to a system instead of a page section, write it in
`content/posts/` with `project: jewels` in its frontmatter — it then appears
under WRITTEN on that system's page, and links back.

## Images, video and audio

Drop the file in `static/media/` and reference it as `media/<name>` from
anywhere — a project page, a post, frontmatter or body. The build rewrites the
path for each page's depth, so one spelling works from every page.

In frontmatter, as a row of the `media:` list:

```markdown
media:
  avenue_fit.png      | ground truth vs reconstruction
  loop:avenue_fit.mp4 | ground truth vs reconstruction
  walkthrough.mp4     | the full run, with sound
  scene_03.mp3        | scene 3 — the cistern
  loop:room_tone.wav  | cistern room tone
  slot                | drop: not shot yet
```

Or in the body, where the image syntax covers video too — the extension
already says which it is:

```markdown
![ground truth vs reconstruction](media/avenue_fit.png)
![the rig running](media/demo.mp4)
![scene 3 — the cistern](media/scene_03.mp3)
```

The text after `|` (or in the `[...]`) is a visible caption **and** the alt
text. Omit it and the media renders bare.

- **`loop:`** on video plays silently on a loop with no controls — a GIF, at a
  fraction of the bytes. Reach for this for result clips. Without it, video
  gets normal controls and only loads on demand (`preload="metadata"`).
- **Audio gets an FFT waterfall.** Every audio file is analysed at build time
  and the plate fills the block above its player: frequency left to right on a
  log axis (40 Hz to 16 kHz), time down the plate, so it reads the way a live
  waterfall moves — newest at the bottom, older rows having scrolled up. See
  below.
- **Audio never autoplays**, whatever you write. `loop:` on audio only sets
  `loop`, which is what you want for room tone and drones.
- **Runtime is read from the file** and printed at the end of the caption —
  MP3 (CBR and VBR), WAV, FLAC, M4A, OGG and Opus. Unreadable, no badge; it
  never guesses.
- **Poster frames and cover art are automatic**: a `clip.jpg`, `clip.png` or
  `clip.webp` sitting beside `clip.mp4` becomes its poster, and beside
  `track.mp3` it replaces that track's waterfall — an explicit picture always
  wins over the generated one.
- **Dimensions are read from the file header** (PNG, JPEG, GIF, WebP) and
  written onto the tag, so the page doesn't jump as media loads.
- **A missing file fails the build**, naming the file and the page that wants
  it, rather than shipping a broken image.
- Images and video tile: one fills the width, two sit side by side, more wrap,
  one column on a phone. Audio always takes the full width — there's no picture
  to tile.

GIFs still work as ordinary images, but an MP4 with `loop:` is typically ten to
fifty times smaller for the same clip:

```bash
ffmpeg -i clip.gif -movflags +faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" clip.mp4
```

Formats: PNG, JPEG, GIF, WebP, AVIF, SVG for images; MP4, WebM, MOV for video;
MP3, WAV, FLAC, M4A, OGG, Opus for audio. MP4 (H.264 + AAC) and MP3 are the
safest choices. WAV and FLAC are large — fine for a short room tone, worth
converting for anything longer:

```bash
ffmpeg -i take.wav -codec:a libmp3lame -q:a 2 take.mp3
```

The players are the browser's native `<audio>` and `<video>` controls: no
JavaScript, keyboard-accessible, and nothing to load. Anything in
`static/media/` ships whether or not a page references it, so delete what you
stop using.

### The audio waterfall

Adding `take.mp3` to `static/media/` also produces `take.spectrum.png` beside
it — a 1000x220 plate of the whole file:

- **frequency** left to right, logarithmic, 40 Hz at the left edge to 16 kHz at
  the right, so speech and music fill the width instead of bunching up;
- **time** down the plate, newest at the bottom;
- **loudness** as colour, over 78 dB from the background through periwinkle to
  ink — the same ramp as the commit fields.

It is generated once and regenerated only when the audio is newer, so builds
stay fast. Plates whose audio you delete are removed on the next build.
**Commit the `.spectrum.png` files**: that way CI never needs ffmpeg.

ffmpeg is used only to decode audio to raw samples — everything after that
(window, FFT, log-frequency mapping, colour, PNG encoding) is plain Node with
zlib, so there is still nothing to install. Without ffmpeg the build says so
and carries on; the block simply has no plate.

To change the look, the constants at the top of `spectrogram.js` are the whole
interface — `W`/`H`, `DB_FLOOR` for contrast, `F_MIN` for the left edge,
`STOPS` for the colour ramp, and `TIME_DOWN` to flip the time axis.

## Adding a post

One Markdown file in `content/posts/`, named `YYYY-MM-DD-slug.md`:

```markdown
---
title: The ledger is the site
date: 2026-08-27
summary: One line for the index and the feed.
tags: Meta, Tooling
project: jewels     # optional — cross-links the post and that system
draft: false        # true keeps it out of the build entirely
---

Body text.
```

The Markdown subset is deliberately small: headings, paragraphs, lists,
blockquotes, fenced code, rules, and inline `**bold**`, `*italic*`, `` `code` ``,
links and images. **List items must be a single line.** Any block starting with
`<` is passed through as raw HTML — that is the escape hatch for anything the
parser doesn't cover.

Images and video work the same way as on project pages — see above.

## Deploying

Live at **https://azoa.online**. Every push to `main` rebuilds and redeploys
via `.github/workflows/deploy.yml`; it takes about 30 seconds.

The repo is `MLTQ/MLTQ.github.io` — GitHub's *user site* name, so it also
answers on `mltq.github.io`, which 301s to `azoa.online` because a custom
domain is set. One site, two URLs, one canonical.

Push over SSH. The OAuth token `gh` holds lacks the `workflow` scope, so an
HTTPS push refuses to touch `.github/workflows/`. `gh auth refresh -s workflow`
would fix that if you ever want HTTPS remotes back.

### The domain

It lives in exactly one place — `domain` in `content/site.js`:

```js
domain: 'azoa.online',   // bare host, no protocol, no trailing slash
```

That drives `dist/CNAME`, the absolute URLs in `sitemap.xml` and `feed.xml`,
the `canonical` and `og:url` tags, and the `Sitemap:` line in `robots.txt`.
Set it to `null` and the site still builds — those four files are just skipped,
and the build says so.

DNS lives at Hover (`ns1/ns2.hover.com`):

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153, .109.153, .110.153, .111.153 |
| AAAA | @ | 2606:50c0:8000::153, 8001::153, 8002::153, 8003::153 |
| CNAME | www | MLTQ.github.io |

### Two things that will waste an hour if you forget them

**The `CNAME` file in the artifact is not enough.** With the Actions-based
Pages source, GitHub does *not* read `CNAME` out of the uploaded artifact —
that only happens for legacy branch deploys. The custom domain has to be set on
the repo itself, in Settings -> Pages or:

```bash
gh api -X PUT repos/MLTQ/MLTQ.github.io/pages -f cname=azoa.online
```

**If the certificate never issues, re-add the domain.** Setting the custom
domain before DNS points at GitHub makes the first validation fail, and GitHub
does not reliably retry. Once `dig +short A azoa.online` returns the four
GitHub addresses, clear the domain and set it again — that re-queues issuance,
and the certificate lands a few minutes later. `https_enforced` cannot be
turned on until the certificate exists.

## Notes

- Muted greys in `styles.css` are set at ≥4.5:1 against the off-white ground;
  the caption sizes here are well under the large-text threshold.
- `dist/` is reconciled, not wiped: the build writes, then deletes only what it
  didn't produce, and never removes a file newer than its own start. Running a
  build by hand while `--serve` is up is safe.
- `--serve` watches `build.js` and `spectrogram.js` as well as `content/` and
  `static/`, and restarts itself when either changes — otherwise it would keep
  rebuilding with the copy of the generator it loaded at startup.
- The build validates as it runs: unknown genus, duplicate slug, a CHRONICA
  entry pointing at a system that doesn't exist, a page file whose slug matches
  no system, a referenced media file that isn't there, or a post missing
  `title` / `date` all fail the build rather than producing a broken page.
  Validation runs before anything is written, so a failed build leaves the last
  good output intact.
- Type is Michroma + Space Mono, loaded from Google Fonts — the only external
  request the site makes. Self-host into `static/` if you'd rather it make none.
