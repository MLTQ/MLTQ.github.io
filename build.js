#!/usr/bin/env node
/* MLTQ Archive — static site build. Plain Node, no dependencies.
   Reads content/ + static/, writes dist/.

       node build.js            build once
       node build.js --serve    build, serve dist/ on :8000, rebuild on change

   Content and commit fields are rendered as HTML/CSS at build time. The
   homepage and project pages each enhance one Lenia surface with WebGPU.
   Every internal link is relative, so content works from file://, from a
   GitHub Pages subpath, or from a custom domain without reconfiguration. */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureSpectra, spectrumName } from './spectrogram.js'
import site from './content/site.js'
import projects from './content/projects.js'
import { projectLeniaMarkup } from './project-lenia.js'
import specimens from './content/lenia.js'
import { footprintSVG } from './lenia-footprint.js'
import { validateSnapshot } from './commit-history.js'
import { renderCommitField } from './commit-field.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(ROOT, 'dist')
const ORIGIN = site.domain ? `https://${site.domain}` : null

/* ------------------------------------------------------------------ utils */

const esc = s => String(s).replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/* relative url from a page `depth` directories below the site root */
const u = (depth, p) => '../'.repeat(depth) + p

/* Every path this build produced. dist/ is reconciled against it at the end
   rather than deleted up front, so a build never leaves the output empty —
   which matters when the dev server is reading dist/ at the same time. */
const WRITTEN = new Set()

const write = (rel, body) => {
  const f = path.join(DIST, rel)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, body)
  WRITTEN.add(path.resolve(f))
}

/* Delete anything in dist/ this build didn't produce, then any dir left empty.

   Two guards make this safe when a second build overlaps — a dev server
   rebuilding while you also run one by hand:
     - removals are best-effort, since the other build may have got there first;
     - nothing modified since this build started is touched, so a build that
       began before a file existed can't sweep away a newer build's output. */
const tryRemove = fn => { try { fn() } catch (e) { if (e.code !== 'ENOENT' && e.code !== 'ENOTEMPTY') throw e } }

function sweep(since, dir = DIST) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      sweep(since, p)
      tryRemove(() => { if (!fs.readdirSync(p).length) fs.rmdirSync(p) })
    } else if (!WRITTEN.has(path.resolve(p))) {
      tryRemove(() => {
        if (fs.statSync(p).mtimeMs < since) fs.unlinkSync(p)
      })
    }
  }
}

const bySlug = () => Object.fromEntries(projects.map(p => [p.slug, p]))
const genusOf = id => site.genera.find(g => g.id === id)
const inGenus = id => projects.filter(p => p.genus === id)
const bridgesTo = id => projects.filter(p => (p.cross || []).includes(id))
const strip = s => String(s).replace(/<[^>]+>/g, '')
const dotted = d => d.replace(/-/g, '.')

/* ------------------------------------------------------- commit heat field */

let commitSnapshot
const heatField = (p, options) => renderCommitField(commitSnapshot.projects[p.slug], commitSnapshot.account, options)

/* ------------------------------------------------------------- footprints */

/* Static density contours share their identity with each project's live creature. */
function footprint(p, size = 56) {
  return `<img class="g footprint" src="lenia/footprints/${p.slug}.svg" width="${size}" height="${size}" alt="" aria-hidden="true" loading="lazy" decoding="async">`
}

/* ------------------------------------------------------------------- media */

/* Files live in static/media/ and are referenced as 'media/name.ext' from
   anywhere — the build rewrites the path for the page's depth, so the same
   reference works from the index, a project page, or a post. */

const MEDIA_DIR = path.join(ROOT, 'static', 'media')
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i
const AUDIO_EXT = /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus)$/i

/* 'media/clip.mp4' + ['jpg','png'] -> 'media/clip.jpg' if that file exists.
   Backs both video poster frames and audio cover art. */
const companion = (ref, exts) => exts
  .map(e => ref.replace(/\.[^.]+$/, `.${e}`))
  .find(p => fs.existsSync(path.join(MEDIA_DIR, p.replace(/^media\//, ''))))

const IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp']

/* Intrinsic dimensions straight out of the file header, so images and videos
   reserve their space and the page doesn't jump as they load. Anything this
   can't read simply renders without the attributes. */
function imageSize(file) {
  try {
    const b = fs.readFileSync(file)
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {          // PNG
      return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
    }
    if (b.length > 10 && b.subarray(0, 3).toString('latin1') === 'GIF') {
      return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) }
    }
    if (b.length > 30 && b.subarray(0, 4).toString('latin1') === 'RIFF'
      && b.subarray(8, 12).toString('latin1') === 'WEBP') {
      const kind = b.subarray(12, 16).toString('latin1')
      if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }
      if (kind === 'VP8L') {
        const n = b.readUInt32LE(21)
        return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }
      }
      if (kind === 'VP8X') return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 }
    }
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {             // JPEG
      let o = 2
      while (o < b.length - 9) {
        if (b[o] !== 0xff) { o++; continue }
        const marker = b[o + 1]
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { h: b.readUInt16BE(o + 5), w: b.readUInt16BE(o + 7) }
        }
        o += 2 + b.readUInt16BE(o + 2)
      }
    }
  } catch { /* unreadable or truncated — fall through */ }
  return null
}

/* Duration in seconds, read out of the container. Returns null rather than a
   guess: a wrong runtime printed next to a track is worse than none. */
function audioDuration(file) {
  try {
    const b = fs.readFileSync(file)
    const ext = path.extname(file).toLowerCase()
    const tag = (o, n) => b.subarray(o, o + n).toString('latin1')

    if (ext === '.wav') {                                   // RIFF: bytes / byte-rate
      if (tag(0, 4) !== 'RIFF' || tag(8, 4) !== 'WAVE') return null
      let o = 12, byteRate = 0
      while (o + 8 <= b.length) {
        const id = tag(o, 4)
        const size = b.readUInt32LE(o + 4)
        if (id === 'fmt ') byteRate = b.readUInt32LE(o + 16)
        if (id === 'data') return byteRate ? size / byteRate : null
        o += 8 + size + (size % 2)
      }
      return null
    }

    if (ext === '.flac') {                                  // STREAMINFO: samples / rate
      if (tag(0, 4) !== 'fLaC') return null
      const s = b.subarray(8)
      const rate = (s[10] << 12) | (s[11] << 4) | (s[12] >> 4)
      const total = (s[13] & 0x0f) * 2 ** 32 + s.readUInt32BE(14)
      return rate ? total / rate : null
    }

    if (ext === '.m4a' || ext === '.aac') {                 // mvhd: duration / timescale
      const i = b.indexOf('mvhd')
      if (i < 0) return null
      const v = b[i + 4]
      const ts = v === 0 ? b.readUInt32BE(i + 16) : b.readUInt32BE(i + 24)
      const dur = v === 0 ? b.readUInt32BE(i + 20) : Number(b.readBigUInt64BE(i + 28))
      return ts ? dur / ts : null
    }

    if (ext === '.ogg' || ext === '.oga' || ext === '.opus') {
      // last Ogg page's granule position, in samples, at the stream's rate
      let last = b.lastIndexOf('OggS')
      if (last < 0) return null
      const granule = Number(b.readBigUInt64LE(last + 6))
      if (tag(28, 8) === 'OpusHead') return granule / 48000   // always 48k for Opus
      const v = b.indexOf('vorbis')
      if (v < 0) return null
      const rate = b.readUInt32LE(v + 11)
      return rate ? granule / rate : null
    }

    if (ext === '.mp3') {
      let o = 0
      if (tag(0, 3) === 'ID3') {                            // skip the ID3v2 tag
        o = 10 + (((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14)
          | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f))
        if (b[5] & 0x10) o += 10
      }
      while (o < b.length - 4 && !(b[o] === 0xff && (b[o + 1] & 0xe0) === 0xe0)) o++
      if (o >= b.length - 4) return null
      const h = b.readUInt32BE(o)
      const mpeg1 = ((h >>> 19) & 3) === 3
      const RATES = mpeg1 ? [44100, 48000, 32000] : [22050, 24000, 16000]
      const rate = RATES[(h >>> 10) & 3]
      const spf = mpeg1 ? 1152 : 576
      if (!rate) return null

      // Xing/Info (or Fraunhofer VBRI) carries an exact frame count
      const stereo = ((h >>> 6) & 3) !== 3
      const xo = o + 4 + (mpeg1 ? (stereo ? 32 : 17) : (stereo ? 17 : 9))
      if (tag(xo, 4) === 'Xing' || tag(xo, 4) === 'Info') {
        if (b.readUInt32BE(xo + 4) & 1) return b.readUInt32BE(xo + 8) * spf / rate
      }
      if (tag(o + 36, 4) === 'VBRI') return b.readUInt32BE(o + 50) * spf / rate

      // no VBR header: the first frame's bitrate is the file's, i.e. CBR
      const BR = mpeg1
        ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
        : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
      const kbps = BR[(h >>> 12) & 0xf]
      return kbps ? (b.length - o) * 8 / (kbps * 1000) : null
    }
  } catch { /* truncated or not what the extension claims */ }
  return null
}

const fmtDuration = s => {
  if (!s || !isFinite(s) || s < 1) return ''
  const t = Math.round(s)
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`
}

/* 'media/name.ext' -> width/height attributes, or '' */
function dimAttrs(ref) {
  const m = ref.match(/^media\/(.+)$/)
  const d = m && imageSize(path.join(MEDIA_DIR, m[1]))
  return d ? ` width="${d.w}" height="${d.h}"` : ''
}

/* NOTE: `label` reaches these already HTML-escaped — inline() escapes the whole
   document body before the image syntax is matched — so nothing here escapes
   again. Callers working from raw data escape once, at the call site. */

function videoTag(ref, { loop = false, label = '' } = {}) {
  const poster = companion(ref, IMG_EXTS)
  const attrs = loop
    ? 'autoplay muted loop playsinline'          // a GIF, but a tenth of the bytes
    : 'controls preload="metadata" playsinline'
  return `<video src="${ref}"${poster ? ` poster="${poster}"` : ''} ${attrs}`
    + `${label ? ` aria-label="${label}"` : ''}></video>`
}

/* Audio never autoplays — `loop:` only loops, for room tone and drones.
   A same-named image beside the file becomes cover art above the player. */
function audioTag(ref, { loop = false, label = '' } = {}) {
  // an explicit cover wins; otherwise the build-time FFT waterfall
  const plate = `media/${spectrumName(ref.replace(/^media\//, ''))}`
  const cover = companion(ref, IMG_EXTS)
    || (fs.existsSync(path.join(MEDIA_DIR, plate.replace(/^media\//, ''))) ? plate : null)
  const isPlate = cover === plate
  return (cover ? `<img src="${cover}" alt=""${isPlate ? ' class="wf"' : ''}${dimAttrs(cover)} loading="lazy" decoding="async">` : '')
    + `<audio src="${ref}" controls preload="metadata"${loop ? ' loop' : ''}`
    + `${label ? ` aria-label="${label}"` : ''}></audio>`
}

/* A caption line, with the runtime appended when one could be read. */
function captionOf(label, ref) {
  const dur = AUDIO_EXT.test(ref)
    ? fmtDuration(audioDuration(path.join(MEDIA_DIR, ref.replace(/^media\//, ''))))
    : ''
  if (!label && !dur) return ''
  return `<figcaption>${label}${dur ? `<span class="dur">${dur}</span>` : ''}</figcaption>`
}

/* One row of a `media:` frontmatter list. */
function mediaTag(m) {
  if (m.placeholder) return `<div class="slot"><span>${esc(m.placeholder)}</span></div>`
  const ref = `media/${m.src}`
  const label = esc(m.caption || '')
  const audio = AUDIO_EXT.test(m.src)
  const inner = audio ? audioTag(ref, { loop: m.loop, label })
    : VIDEO_EXT.test(m.src) ? videoTag(ref, { loop: m.loop, label })
      : `<img src="${ref}" alt="${label}"${dimAttrs(ref)} loading="lazy" decoding="async">`
  const cap = captionOf(label, ref)
  // audio has no picture to tile, so it takes the full width of the grid
  return cap || audio ? `<figure${audio ? ' class="au"' : ''}>${inner}${cap}</figure>` : inner
}

/* ------------------------------------------------------- homepage specimen */

function leniaMarkup() {
  return `<figure class="lenia" data-lenia data-mode="still" aria-label="Living Lenia colony">
<div class="lenia-stage">
<img class="lenia-still" src="lenia/still.svg" alt="Six small glassy Orbium gliders in green and purple, facing different directions." width="660" height="360">
<canvas aria-hidden="true" aria-label="Interactive jelly Lenia colony. Drag to stretch; arrow keys to nudge; space to pause." aria-describedby="lenia-hint" tabindex="-1"></canvas>
<span class="lenia-mark" aria-hidden="true">01 / BIOTA</span>
<button class="lenia-reset" type="button" data-reset disabled aria-label="Reset Lenia specimen" title="Start a new colony"><span aria-hidden="true">↺</span> Reset</button>
</div>
<figcaption class="lenia-caption">
<div><a href="https://github.com/Chakazul/Lenia" class="lenia-name" title="Lenia by Bert Chan">ORBIUM UNICAUDATUS</a><span class="lenia-state"><i aria-hidden="true"></i><span data-status>STILL SPECIMEN</span></span></div>
<p class="lenia-density" aria-label="Cell density: green at zero, purple at one"><span>CELL DENSITY</span><span>0</span><i aria-hidden="true"></i><span>1</span></p>
<div class="lenia-actions"><span id="lenia-hint" data-hint>Drag gently. Let go.</span><button type="button" data-pause disabled aria-label="Pause Lenia simulation">Pause</button></div>
<p class="lenia-invitation">These are <a href="https://arxiv.org/pdf/1812.05433">mathematical life forms</a>, feel free to pet them, they don’t bite</p>
</figcaption>
<noscript><p class="lenia-note">Enable JavaScript to bring the specimen to life.</p></noscript>
</figure>
<script type="module" src="lenia/index.js"></script>`;
}

/* Plain section navigation is always available, with or without graphics. */
function genusNav(depth) {
  const items = [
    ...site.genera.map(g => ({ label: g.label, href: u(depth, `index.html#${g.id}`) })),
    { label: 'SCRIPTA', href: u(depth, 'writing.html') },
    { label: 'CHRONICA', href: u(depth, 'chronica.html') },
  ]
  return `<nav class="gnav" aria-label="Sections">${items
    .map(i => `<a href="${i.href}">${esc(i.label)}</a>`).join('')}</nav>`
}

/* -------------------------------------------------------------- page shell */

function footerBands(depth, filed, source) {
  const links = site.elsewhere.filter(l => l.href).slice()
  if (ORIGIN) links.push({ label: 'RSS', href: u(depth, 'feed.xml') })
  const elsewhere = links.map(l =>
    `<a href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' rel="me noopener"' : ''}>${esc(l.label)}</a>`
  ).join(' / ') || '—'
  return `<footer class="foot">
${filed ? `<div class="footband lilac"><h2>FILED UNDER</h2><p>${filed}</p></div>` : ''}
<div class="footband lilac"><h2>ELSEWHERE</h2><p>${source ? `${source} · ` : ''}${elsewhere}</p></div>
<div class="footband green"><p>${esc(site.name)} — ${site.colophon} © ${new Date().getFullYear()}.</p></div>
</footer>`
}

function shell({ title, description, depth = 0, canonical, body }) {
  const full = title === site.name
    ? `${site.name} — ${site.tagline.toLowerCase()}`
    : `${title} — ${site.name}`
  const desc = strip(description || site.description)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#ecedec">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
${ORIGIN && canonical ? `<meta property="og:url" content="${ORIGIN}/${canonical}">
<link rel="canonical" href="${ORIGIN}/${canonical}">` : ''}
<link rel="icon" href="${u(depth, 'favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${u(depth, 'styles.css')}">${canonical === 'index.html' || canonical?.startsWith('projects/') ? `\n<link rel="stylesheet" href="${u(depth, 'lenia/lenia.css')}">` : ''}${ORIGIN ? `
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="${u(depth, 'feed.xml')}">` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
${body}
</div>
</body>
</html>
`
}

/* ---------------------------------------------------------------- markdown */

/* A deliberately small subset: headings, paragraphs, lists, blockquotes,
   fenced code, rules, and inline emphasis/code/links/images. A block that
   starts with '<' passes through as raw HTML — that is the escape hatch. */

const NUL = '\u0000'

/* `key: value` pairs, plus indented continuation lines that collect into a
   list — enough structure for stats and media without dragging in YAML:

       stats:
         23.4 dB | ONE-SHOT ENCODER, HELD-OUT
         ~600 KB | 64-FRAME WINDOW ON DISK                                    */
function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { data: {}, body: src }
  const data = {}
  let key = null
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue
    if (/^\s+\S/.test(line) && key) {
      if (!Array.isArray(data[key])) data[key] = []
      data[key].push(line.trim())
      continue
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kv) continue
    key = kv[1]
    const v = kv[2].trim().replace(/^["']|["']$/g, '')
    data[key] = v === 'true' ? true : v === 'false' ? false : v
  }
  return { data, body: src.slice(m[0].length) }
}

/* frontmatter list rows: 'left | right'. The first pipe splits; later pipes
   stay in the right-hand side, so captions may contain them. */
const splitRow = s => {
  const i = s.indexOf('|')
  return i === -1 ? [s.trim(), ''] : [s.slice(0, i).trim(), s.slice(i + 1).trim()]
}
const asList = v => (Array.isArray(v) ? v
  : String(v || '').split(',').map(x => x.trim()).filter(Boolean))

function inline(s) {
  const codes = []
  let t = esc(s).replace(/`([^`]+)`/g, (_, c) => NUL + (codes.push(c) - 1) + NUL)
  /* ![caption](media/thing.png) — and the same syntax for video, since
     Markdown has none of its own and the extension already says which it is */
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, h) => {
    const audio = AUDIO_EXT.test(h)
    const inner = audio ? audioTag(h, { label: a })
      : VIDEO_EXT.test(h) ? videoTag(h, { label: a })
        : `<img src="${h}" alt="${a}"${dimAttrs(h)} loading="lazy" decoding="async">`
    const cap = captionOf(a, h)
    return cap || audio ? `<figure${audio ? ' class="au"' : ''}>${inner}${cap}</figure>` : inner
  })
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, x, h) => `<a href="${h}"${/^https?:/.test(h) ? ' rel="noopener"' : ''}>${x}</a>`)
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
  return t.replace(new RegExp(NUL + '(\\d+)' + NUL, 'g'), (_, i) => `<code>${codes[i]}</code>`)
}

const BLOCK = /^(#{1,4}\s|>|[-*+]\s|\d+[.)]\s|```|<)/

/* Render a document body. HTML comments are notes-to-self, not content: they
   are dropped, so scaffold guidance never ships and a body that holds nothing
   but comments still counts as empty.

   'media/x.png' is written the same way everywhere and rewritten here for the
   page's depth — a page one directory down needs '../media/x.png'. */
const renderBody = (src, depth = 0) => {
  const clean = src.replace(/<!--[\s\S]*?-->/g, '')
  if (!clean.trim()) return ''
  return markdown(clean)
    .replace(/(src|href|poster)="media\//g, `$1="${u(depth, 'media/')}`)
}

/* Every media file a rendered page refers to, as 'name.ext'. */
const mediaRefs = html =>
  [...html.matchAll(/(?:src|href|poster)="(?:\.\.\/)*media\/([^"?#]+)"/g)].map(m => m[1])

function markdown(src) {
  const L = src.split(/\r?\n/)
  const out = []
  let i = 0
  const take = re => { const b = []; while (i < L.length && re.test(L[i])) b.push(L[i++]); return b }
  while (i < L.length) {
    const l = L[i]
    if (!l.trim()) { i++; continue }
    if (/^```/.test(l)) {
      i++
      const b = []
      while (i < L.length && !/^```/.test(L[i])) b.push(L[i++])
      i++
      out.push(`<pre><code>${esc(b.join('\n'))}</code></pre>`)
      continue
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue }
    const h = l.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const lv = Math.min(4, Math.max(2, h[1].length))
      out.push(`<h${lv}>${inline(h[2])}</h${lv}>`)
      i++
      continue
    }
    if (/^>\s?/.test(l)) {
      const inner = take(/^>\s?/).map(x => x.replace(/^>\s?/, '')).join('\n')
      out.push(`<blockquote>${markdown(inner)}</blockquote>`)
      continue
    }
    if (/^[-*+]\s+/.test(l)) {
      out.push(`<ul>${take(/^[-*+]\s+/)
        .map(x => `<li>${inline(x.replace(/^[-*+]\s+/, ''))}</li>`).join('')}</ul>`)
      continue
    }
    if (/^\d+[.)]\s+/.test(l)) {
      out.push(`<ol>${take(/^\d+[.)]\s+/)
        .map(x => `<li>${inline(x.replace(/^\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`)
      continue
    }
    if (/^</.test(l)) { out.push(take(/\S/).join('\n')); continue }
    const b = []
    while (i < L.length && L[i].trim() && !BLOCK.test(L[i])) b.push(L[i++])
    out.push(`<p>${inline(b.join(' '))}</p>`)
  }
  return out.join('\n')
}

/* ----------------------------------------------------------- project pages */

/* content/projects/<slug>.md — the hand-written half of a project page.
   projects.js owns what the index and cross-filing need; this file owns the page:
   its prose, and the stats / media / links that appear nowhere else. Both
   halves are optional-friendly — a project with no page file falls back to
   rendering its `log` as FIELD NOTES. */

const PAGES_DIR = path.join(ROOT, 'content', 'projects')

function loadProjectPages() {
  const pages = {}
  if (!fs.existsSync(PAGES_DIR)) return pages
  for (const f of fs.readdirSync(PAGES_DIR).filter(x => x.endsWith('.md'))) {
    const slug = f.replace(/\.md$/, '')
    const { data, body } = frontmatter(fs.readFileSync(path.join(PAGES_DIR, f), 'utf8'))
    pages[slug] = {
      file: `content/projects/${f}`,
      stats: asList(data.stats).map(r => { const [v, k] = splitRow(r); return { v, k } }),
      links: asList(data.links).map(r => { const [label, href] = splitRow(r); return { label, href } }),
      mediaAfterBody: data.media_after_body === true,
      media: asList(data.media).map(r => {
        const [lhs, caption] = splitRow(r)
        if (lhs === 'slot') return { placeholder: caption || 'drop media here' }
        // 'loop:clip.mp4' plays silently on a loop, the way a GIF would
        const loop = lhs.startsWith('loop:')
        return { src: loop ? lhs.slice(5).trim() : lhs, caption, loop }
      }),
      html: renderBody(body, 1),
    }
  }
  return pages
}

/* ------------------------------------------------------------------- posts */

const POSTS_DIR = path.join(ROOT, 'content', 'posts')

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return []
  return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).map(f => {
    const { data, body } = frontmatter(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'))
    if (!data.title || !data.date) {
      throw new Error(`content/posts/${f}: frontmatter needs 'title' and 'date'`)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error(`content/posts/${f}: date must be YYYY-MM-DD, got '${data.date}'`)
    }
    return {
      slug: data.slug || f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
      title: data.title,
      date: data.date,
      draft: data.draft === true,
      summary: data.summary || '',
      tags: (data.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      project: data.project || null,
      html: renderBody(body, 1),
    }
  }).filter(p => !p.draft).sort((a, b) => b.date.localeCompare(a.date))
}

/* -------------------------------------------------------------- index page */

function logList(log) {
  if (!log || !log.length) return ''
  return `<div class="plog">${log.map(e =>
    `<div>${e.date ? `<b>${esc(e.date)}</b> — ` : '— '}${e.text}</div>`).join('')}</div>`
}

function statusLine(p) {
  const mesh = p.mesh ? ' · ON THE <a href="index.html#retia">MESH</a>' : ''
  const dim = p.status === 'DORMANT' || p.status === 'SEED' ? ' dim' : ''
  return `<p class="pstatus${dim}">${esc(p.status)}${mesh}</p>`
}

function featuredRow(p) {
  return `<article class="row">
<div>
<a class="idlink" href="projects/${p.slug}.html">${footprint(p, 56)}<h3 class="pname">${esc(p.name)}</h3></a>
${statusLine(p)}
</div>
<div>
<p class="pdesc">${p.summary}</p>
${logList(p.log)}
</div>
<div class="hmwrap">${heatField(p)}</div>
</article>`
}

function compactRow(p) {
  const cross = (p.cross || []).map(c =>
    ` Cross-filed: <a href="index.html#${c}">${esc(genusOf(c).label)}</a>.`).join('')
  return `<article class="crow">
<h3 class="n"><a class="compact-id" href="projects/${p.slug}.html">${footprint(p, 28)}<span>${esc(p.name)}</span></a></h3>
<div class="d">${p.summary}${cross}</div>
<div class="s">${esc(p.status)}</div>
</article>`
}

function genusSection(g) {
  const list = inGenus(g.id)
  const bridges = bridgesTo(g.id)
  const count = `${list.length} SYSTEM${list.length === 1 ? '' : 'S'}`
    + (bridges.length ? ` + ${bridges.length} BRIDGE${bridges.length === 1 ? '' : 'S'}` : '')
  const bridgeRow = bridges.length ? `<div class="crow bridges">
<div class="n"></div>
<div class="d">↖ Bridges: ${bridges.map(b =>
    `<a href="projects/${b.slug}.html">${esc(b.name)}</a>`).join(', ')} — also filed under ${esc(g.label)}.</div>
<div class="s"></div>
</div>` : ''
  return `<section id="${g.id}" aria-labelledby="${g.id}-h">
<div class="band band-${g.band}"><h2 id="${g.id}-h">${esc(g.label)}</h2><span class="count">${count}</span></div>
${list.filter(p => p.featured).map(featuredRow).join('\n')}
${list.filter(p => !p.featured).map(compactRow).join('\n')}
${bridgeRow}
</section>`
}

function chronicaLine(e, depth = 0) {
  const p = e.project && bySlug()[e.project]
  const who = p ? `<a href="${u(depth, `projects/${p.slug}.html`)}">${esc(p.name)}</a>: ` : ''
  return `<p id="${e.date.replace(/\./g, '-')}"><b>${esc(e.date)}</b> — ${who}${e.text}</p>`
}

function postRow(p, depth) {
  const href = u(depth, `writing/${p.slug}.html`)
  return `<article class="crow">
<h3 class="n"><a href="${href}">${esc(dotted(p.date))}</a></h3>
<div class="d"><a href="${href}">${esc(p.title)}</a>${p.summary ? ` — ${esc(p.summary)}` : ''}</div>
<div class="s">${esc(p.tags[0] || '')}</div>
</article>`
}

function buildIndex(posts) {
  const body = `<header class="hdr">
<div>
<div class="identity">
<h1>${esc(site.homeTitle)}</h1>
<p class="sub"><span class="sr-only">${esc(site.tagline)}</span>${[...site.tagline].map(letter => `<span aria-hidden="true">${esc(letter)}</span>`).join('')}</p>
</div>
<p class="about">${site.about}</p>
${genusNav(0)}
</div>
${leniaMarkup()}
</header>
<main id="main">
${site.genera.map(genusSection).join('\n')}

<section id="scripta" aria-labelledby="scripta-h">
<div class="band band-lilac"><h2 id="scripta-h">SCRIPTA</h2><span class="count">${posts.length} WRITTEN</span></div>
${posts.length
    ? posts.slice(0, 4).map(p => postRow(p, 0)).join('\n')
    : '<div class="loglist"><p>Nothing written yet.</p></div>'}
<div class="loglist"><p class="more"><a href="writing.html">ALL WRITING →</a></p></div>
</section>

<section id="chronica" aria-labelledby="chronica-h">
<div class="band band-lilac"><h2 id="chronica-h">CHRONICA</h2><span class="count">ALL SYSTEMS, INTERLEAVED</span></div>
<div class="loglist">
${site.chronica.slice(0, 6).map(e => chronicaLine(e, 0)).join('\n')}
<p class="more"><a href="chronica.html">FULL CHRONICA →</a></p>
</div>
</section>
</main>
${footerBands(0)}`
  write('index.html', shell({
    title: site.name, description: site.description, depth: 0, canonical: 'index.html', body,
  }))
}

/* ----------------------------------------------------------- chronica page */

function buildChronica() {
  const n = site.chronica.length
  const body = `<div class="crumb"><a href="index.html">← ${esc(site.name)} / INDEX</a><span>${n} ENTR${n === 1 ? 'Y' : 'IES'}</span></div>
<header class="phdr">
<div>
<h1 class="mh">CHRONICA</h1>
<p class="lede">Every system, interleaved. The full log, newest first. Longer pieces live in <a href="writing.html">SCRIPTA</a>.</p>
</div>
</header>
<main id="main">
<div class="loglist wide">
${site.chronica.map(e => chronicaLine(e, 0)).join('\n')}
</div>
${genusNav(0)}
</main>
${footerBands(0)}`
  write('chronica.html', shell({
    title: 'CHRONICA',
    description: 'The full interleaved log across every system.',
    depth: 0, canonical: 'chronica.html', body,
  }))
}

/* ------------------------------------------------------------ project page */

function buildProject(p, posts, pages) {
  const sibs = inGenus(p.genus)
  const i = sibs.findIndex(s => s.slug === p.slug)
  const prev = sibs[i - 1]
  const next = sibs[i + 1]
  const related = posts.filter(x => x.project === p.slug)
  const page = pages[p.slug] || { stats: [], media: [], links: [], html: '' }
  const history = heatField(p, { columns: 40, large: true })
  const gallery = page.media.length ? `<div class="media">${page.media.map(m =>
    mediaTag(m).replace(/(src|poster)="media\//g, `$1="${u(1, 'media/')}`)).join('')}</div>` : ''

  const filed = [
    `<a href="${u(1, `index.html#${p.genus}`)}">${esc(genusOf(p.genus).label)}</a>`,
    ...(p.cross || []).map(c => `<a href="${u(1, `index.html#${c}`)}">${esc(genusOf(c).label)}</a>`),
    ...(p.tags || []).map(esc),
  ].join('/')

  const source = [
    p.repo ? `Source: <a href="https://github.com/${p.repo}" rel="noopener">${esc(p.repo)}</a>` : null,
    ...page.links.map(l => `<a href="${esc(l.href)}" rel="noopener">${esc(l.label)}</a>`),
  ].filter(Boolean).join(' · ')

  const body = `<div class="crumb">
<a href="${u(1, 'index.html')}">← ${esc(site.name)} / INDEX</a>
<span>${esc(p.status)}${p.mesh ? ' · ON THE MESH' : ''}</span>
</div>
<header class="phdr phdr-specimen">
${projectLeniaMarkup(p.slug)}
<div>
<h1 class="mh">${esc(p.name)}</h1>
<p class="lede">${p.summary}</p>
</div>
</header>
<main id="main">
${history ? `<div class="pad">${history}</div>` : ''}
${page.stats.length ? `<div class="stats">${page.stats.map(s =>
    `<div class="stat"><div class="v">${esc(s.v)}</div><div class="k">${esc(s.k)}</div></div>`).join('')}</div>` : ''}
${page.mediaAfterBody ? '' : gallery}
${page.html
    ? `<article class="prose page">${page.html}</article>`
    : `<div class="entries"><section>
<h2 class="mh eh">FIELD NOTES</h2>
${(p.log || []).map(e => `<p>${e.date ? `<b>${esc(e.date)}</b> — ` : ''}${e.text}</p>`).join('\n')}
</section></div>`}
${page.mediaAfterBody ? gallery : ''}
${related.length ? `<div class="entries"><section>
<h2 class="mh eh">WRITTEN</h2>
${related.map(x => `<p><b>${esc(dotted(x.date))}</b> — <a href="${u(1, `writing/${x.slug}.html`)}">${esc(x.title)}</a></p>`).join('\n')}
</section></div>` : ''}
<nav class="pnav" aria-label="Other systems in ${esc(genusOf(p.genus).label)}">
<div>${prev ? `<a href="${prev.slug}.html">← ${esc(prev.name)}</a>` : ''}</div>
<div class="mid"><a href="${u(1, `index.html#${p.genus}`)}">${esc(genusOf(p.genus).label)}</a></div>
<div class="end">${next ? `<a href="${next.slug}.html">${esc(next.name)} →</a>` : ''}</div>
</nav>
</main>
${footerBands(1, filed, source)}`

  write(`projects/${p.slug}.html`, shell({
    title: p.name, description: p.summary,
    depth: 1, canonical: `projects/${p.slug}.html`, body,
  }))
}

/* ------------------------------------------------------ writing + posts */

function buildWriting(posts) {
  const n = posts.length
  write('writing.html', shell({
    title: 'SCRIPTA',
    description: `Writing from ${site.name}.`,
    depth: 0, canonical: 'writing.html',
    body: `<div class="crumb"><a href="index.html">← ${esc(site.name)} / INDEX</a><span>${n} ENTR${n === 1 ? 'Y' : 'IES'}</span></div>
<header class="phdr">
<div>
<h1 class="mh">SCRIPTA</h1>
<p class="lede">Longer pieces. The short dated log lives in <a href="chronica.html">CHRONICA</a>.</p>
</div>
</header>
<main id="main">
${n ? posts.map(p => postRow(p, 0)).join('\n') : '<div class="loglist"><p>Nothing written yet.</p></div>'}
${genusNav(0)}
</main>
${footerBands(0)}`,
  }))

  posts.forEach((p, i) => {
    const prev = posts[i + 1]   // posts are newest-first, so i+1 is older
    const next = posts[i - 1]
    const proj = p.project && bySlug()[p.project]
    const filed = [
      ...(proj ? [`<a href="${u(1, `projects/${proj.slug}.html`)}">${esc(proj.name)}</a>`] : []),
      ...p.tags.map(esc),
    ].join('/') || null
    write(`writing/${p.slug}.html`, shell({
      title: p.title, description: p.summary, depth: 1,
      canonical: `writing/${p.slug}.html`,
      body: `<div class="crumb"><a href="${u(1, 'writing.html')}">← ${esc(site.name)} / SCRIPTA</a><span>${esc(dotted(p.date))}</span></div>
<header class="phdr">
<div>
<h1 class="mh">${esc(p.title)}</h1>
${p.summary ? `<p class="lede">${esc(p.summary)}</p>` : ''}
</div>
</header>
<main id="main">
<article class="prose">${p.html}</article>
<nav class="pnav" aria-label="Other writing">
<div>${prev ? `<a href="${prev.slug}.html">← ${esc(prev.title)}</a>` : ''}</div>
<div class="mid"><a href="${u(1, 'writing.html')}">SCRIPTA</a></div>
<div class="end">${next ? `<a href="${next.slug}.html">${esc(next.title)} →</a>` : ''}</div>
</nav>
</main>
${footerBands(1, filed)}`,
    }))
  })
}

/* --------------------------------------------------------- feed / sitemap */

const rfc822 = iso => new Date(`${iso}T12:00:00Z`).toUTCString()

function buildFeedAndSitemap(posts) {
  if (!ORIGIN) {
    console.log('  · site.domain is null — skipped CNAME, sitemap.xml, feed.xml')
    return
  }
  write('CNAME', `${site.domain}\n`)

  const urls = ['index.html', 'writing.html', 'chronica.html',
    ...projects.map(p => `projects/${p.slug}.html`),
    ...posts.map(p => `writing/${p.slug}.html`)]
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(x => `  <url><loc>${ORIGIN}/${x}</loc></url>`).join('\n')}
</urlset>
`)

  const items = [
    ...posts.map(p => ({
      title: p.title,
      link: `${ORIGIN}/writing/${p.slug}.html`,
      date: p.date,
      desc: p.summary || p.title,
    })),
    ...site.chronica.map(e => {
      const pr = e.project && bySlug()[e.project]
      return {
        title: `${pr ? `${pr.name}: ` : ''}${strip(e.text)}`,
        link: `${ORIGIN}/chronica.html#${e.date.replace(/\./g, '-')}`,
        date: e.date.replace(/\./g, '-'),
        desc: strip(e.text),
      }
    }),
  ].sort((a, b) => b.date.localeCompare(a.date))

  write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(site.name)}</title>
<link>${ORIGIN}/</link>
<description>${esc(site.description)}</description>
<language>en</language>
<atom:link href="${ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map(it => `<item>
<title>${esc(it.title)}</title>
<link>${it.link}</link>
<guid isPermaLink="true">${it.link}</guid>
<pubDate>${rfc822(it.date)}</pubDate>
<description>${esc(it.desc)}</description>
</item>`).join('\n')}
</channel>
</rss>
`)
}

/* ------------------------------------------------------------------- build */

function validate() {
  const seen = new Set()
  for (const p of projects) {
    if (!p.slug || !p.name) throw new Error(`project missing slug or name: ${JSON.stringify(p).slice(0, 60)}`)
    if (seen.has(p.slug)) throw new Error(`duplicate project slug '${p.slug}'`)
    seen.add(p.slug)
    if (!genusOf(p.genus)) throw new Error(`${p.slug}: unknown genus '${p.genus}'`)
    for (const c of p.cross || []) {
      if (!genusOf(c)) throw new Error(`${p.slug}: cross-filed to unknown genus '${c}'`)
    }
  }
  for (const e of site.chronica) {
    if (e.project && !seen.has(e.project)) {
      throw new Error(`chronica ${e.date}: unknown project '${e.project}'`)
    }
  }
  // a page file whose name matches no project would silently never render
  if (fs.existsSync(PAGES_DIR)) {
    for (const f of fs.readdirSync(PAGES_DIR).filter(x => x.endsWith('.md'))) {
      const slug = f.replace(/\.md$/, '')
      if (!seen.has(slug)) {
        throw new Error(`content/projects/${f}: no project with slug '${slug}' in content/projects.js`)
      }
    }
  }
}

/* A media file referenced but not present would ship as a broken image, so it
   fails the build instead. Runs before dist/ is cleared. */
function validateMedia(pages, posts) {
  const seen = []
  for (const [slug, pg] of Object.entries(pages)) {
    for (const m of pg.media) if (m.src) seen.push([pg.file, m.src])
    for (const r of mediaRefs(pg.html)) seen.push([pg.file, r])
  }
  for (const p of posts) {
    for (const r of mediaRefs(p.html)) seen.push([`content/posts/${p.slug}`, r])
  }
  const missing = seen.filter(([, r]) => !fs.existsSync(path.join(MEDIA_DIR, r)))
  if (missing.length) {
    const [where, what] = missing[0]
    throw new Error(`${where}: references media/${what}, but static/media/${what} does not exist`
      + (missing.length > 1 ? ` (and ${missing.length - 1} more)` : ''))
  }
}

/* Create content/projects/<slug>.md for any project that lacks one, seeded
   from what projects.js already knows. Never overwrites an existing file. */
function scaffold() {
  fs.mkdirSync(PAGES_DIR, { recursive: true })
  let made = 0
  for (const p of projects) {
    const f = path.join(PAGES_DIR, `${p.slug}.md`)
    if (fs.existsSync(f)) continue
    fs.writeFileSync(f, `---
# Page-only fields for ${p.name}. Uncomment what you need; delete the rest.
# Everything else about this system lives in content/projects.js.
# stats:
#   23.4 dB | WHAT IT MEASURES
#   ~600 KB | ON DISK
# media:
#   something.gif | alt text        (file goes in static/media/)
#   slot | drop: a placeholder caption
# links:
#   Design notes | https://example.com
---

<!-- Write the page here, in Markdown. A heading like

         ## 2026.09.01 — WHAT HAPPENED

     becomes a dated section, newest at the top.

     While this body is empty, the page falls back to the \`log\` lines from
     content/projects.js, rendered as FIELD NOTES. Write anything real here
     and it takes over. -->
`)
    made++
  }
  console.log(made
    ? `scaffolded ${made} page file${made === 1 ? '' : 's'} in content/projects/`
    : 'every project already has a page file in content/projects/')
}

function build() {
  const t0 = Date.now()
  validate()
  commitSnapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/commit-history.json'), 'utf8'))
  validateSnapshot(commitSnapshot, projects)
  const spectra = ensureSpectra(MEDIA_DIR, m => console.log(m))
  if (spectra.missingFfmpeg) {
    console.log(`  · ${spectra.skipped} audio file(s) have no waterfall — ffmpeg not found`)
  }

  const posts = loadPosts()
  const pages = loadProjectPages()
  validateMedia(pages, posts)

  WRITTEN.clear()
  fs.mkdirSync(DIST, { recursive: true })

  const STATIC = path.join(ROOT, 'static')
  if (fs.existsSync(STATIC)) {
    fs.cpSync(STATIC, DIST, { recursive: true })
    // record the copies so the sweep below doesn't treat them as stale
    ;(function mark(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) mark(p)
        else WRITTEN.add(path.resolve(DIST, path.relative(STATIC, p)))
      }
    })(STATIC)
  }

  projects.forEach(p => write(`lenia/footprints/${p.slug}.svg`, footprintSVG(specimens[p.slug])))
  buildIndex(posts)
  buildChronica()
  buildWriting(posts)
  projects.forEach(p => buildProject(p, posts, pages))

  write('404.html', shell({
    title: 'NOT FOUND', description: 'No such page.', depth: 0,
    body: `<header class="phdr">
<div>
<h1 class="mh">404</h1>
<p class="lede">Nothing is filed here. It may have been buried, or it may never have been grown.</p>
</div>
</header>
<main id="main">${genusNav(0)}</main>
${footerBands(0)}`,
  }))
  write('robots.txt', `User-agent: *\nAllow: /\n${ORIGIN ? `\nSitemap: ${ORIGIN}/sitemap.xml\n` : ''}`)
  write('.nojekyll', '')
  buildFeedAndSitemap(posts)
  sweep(t0)

  const written = projects.filter(p => pages[p.slug] && pages[p.slug].html).length
  console.log(`${site.name} — ${projects.length} systems (${written} with page files), `
    + `${posts.length} posts, ${site.chronica.length} log entries `
    + `→ dist/ (${Date.now() - t0}ms)`)
}

/* -------------------------------------------------------------- dev server */

async function serve() {
  const { createServer } = await import('node:http')
  const { spawn } = await import('node:child_process')
  const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
    '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.json': 'application/json',
  }
  const port = +(process.env.PORT || 8000)
  const server = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'
    let f = path.resolve(DIST, rel)
    if (!f.startsWith(DIST)) { res.writeHead(403).end('forbidden'); return }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html')
    if (!fs.existsSync(f)) {
      f = path.join(DIST, '404.html')
      res.writeHead(404, { 'content-type': TYPES['.html'] })
    } else {
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' })
    }
    res.end(fs.readFileSync(f))
  }).listen(port, () => console.log(`  · serving dist/ at http://localhost:${port}`))

  let t
  const rebuild = () => {
    clearTimeout(t)
    t = setTimeout(async () => {
      try {
        // cache-bust the ESM imports so edited content is picked up
        const s = await import(`./content/site.js?${Date.now()}`)
        Object.assign(site, s.default)
        const p = await import(`./content/projects.js?${Date.now()}`)
        projects.length = 0
        projects.push(...p.default)
        build()
      } catch (e) {
        console.error(`  ! ${e.message}`)
      }
    }, 60)
  }
  for (const dir of ['content', 'static']) {
    const d = path.join(ROOT, dir)
    if (fs.existsSync(d)) fs.watch(d, { recursive: true }, rebuild)
  }

  /* The generator itself is already loaded into this process, so editing it
     would otherwise leave the server rebuilding with stale code — and quietly
     overwriting correct output from a build you ran by hand. Re-exec instead. */
  let restarting = false
  for (const f of ['build.js', 'spectrogram.js', 'commit-history.js', 'commit-field.js']) {
    const p = path.join(ROOT, f)
    if (!fs.existsSync(p)) continue
    fs.watch(p, () => {
      if (restarting) return
      restarting = true
      console.log(`  · ${f} changed — restarting`)
      setTimeout(() => {
        // free the port first, or the replacement can't bind
        server.closeAllConnections?.()
        server.close(() => {
          spawn(process.execPath, process.argv.slice(1), { stdio: 'inherit' })
            .on('exit', c => process.exit(c ?? 0))
        })
      }, 120)
    })
  }
}

if (process.argv.includes('--scaffold')) scaffold()
build()
if (process.argv.includes('--serve')) serve()
