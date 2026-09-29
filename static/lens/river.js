// River: time runs left to right, one column per token. Each column stacks what that token reads
// from earlier positions (summed over heads, over a band of layers), sorted: top = read most.
// Ribbons follow the same source (source mode) or the same meaning (concept mode: the J-lens words
// of the messages) from column to column, so you watch the heads re-sort the past as tokens arrive.
const UI = window.lensUI;
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";

let active = false, raw = null, reqId = 0, reveal = Infinity, playing = false, timer = null;

const posHue = (f) => (200 + 215 * f) % 360;
const hashHue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) >>> 0; return h % 360; };
const tok = (s) => UI.show(s).trim() || "·";
const conceptKey = (s) => s.trim().toLowerCase();
const meaningful = (s) => /[\p{L}\p{N}]/u.test(s) && !/^<\|.*\|>$/.test(s.trim());

function f16(buf) {  // float16 -> float32
  const u = new Uint16Array(buf), out = new Float32Array(u.length);
  for (let i = 0; i < u.length; i++) {
    const h = u[i], s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
    out[i] = e === 0 ? s * 2 ** -14 * (f / 1024) : e === 31 ? (f ? NaN : s * Infinity) : s * 2 ** (e - 15) * (1 + f / 1024);
  }
  return out;
}
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;

function status(html) { const el = $("riverstatus"); el.style.display = html ? "flex" : "none"; el.innerHTML = html || ""; }

async function load() {
  const data = UI.data;
  if (!data) { status("Run a prompt first."); return null; }
  if (data.knockout) { status("The river is computed for the original run, not the knockout view."); return null; }
  if (raw && raw._data === data) return raw;
  const my = ++reqId;
  const t0 = performance.now();
  const tick = () => status(`Decomposing every layer's attention and memory into per-source messages, and reading them with the J-lens… ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  tick(); const iv = setInterval(tick, 1000);
  try {
    const d = await (await fetch("/api/river")).json();
    if (my !== reqId) return null;
    if (d.error || d.detail) { status(UI.esc(d.error || JSON.stringify(d.detail))); return null; }
    d.R = f16(b64(d.rel));
    d.C = new Int32Array(b64(d.conc));
    d.CW = new Float32Array(b64(d.concw));
    d._data = data;
    raw = d;
    status("");
    return d;
  } finally { clearInterval(iv); }
}

function band() {
  const v = $("rvBand").value;
  if (v === "custom") return [+$("rvLo").value, +$("rvHi").value];
  return v.split("-").map(Number);
}

// Per column t: list of {key, label, w, hue, info} before normalisation.
function columns(d) {
  const [lo, hi] = band(), T = d.T, skipPrev = $("rvPrev").checked, mode = $("rvMode").value;
  const cols = [];
  if (mode === "source") {
    for (let t = 1; t < T; t++) {
      const items = [];
      for (let s = 0; s < t; s++) {
        if (skipPrev && s === t - 1) continue;
        let w = 0;
        for (let l = lo; l <= hi; l++) w += d.R[(l * T + t) * T + s];
        items.push({ key: "s" + s, label: tok(d.tokens[s]), w, hue: posHue(T > 1 ? s / (T - 1) : 0), s });
      }
      cols.push({ t, items });
    }
  } else {
    // concepts: sum weights per (t, word) over the band; each word remembers which sources carried it
    const per = new Map();  // t -> Map(key -> {w, label, src: Map(s -> w)})
    for (let k = 0; k < d.CW.length; k++) {
      const l = d.C[4 * k], t = d.C[4 * k + 1], s = d.C[4 * k + 2], id = d.C[4 * k + 3];
      if (l < lo || l > hi || (skipPrev && s === t - 1)) continue;
      const word = d.vocab[id];
      if (!meaningful(word)) continue;
      const key = conceptKey(word);
      if (!per.has(t)) per.set(t, new Map());
      const m = per.get(t), e = m.get(key) || { w: 0, label: word.trim(), src: new Map() };
      e.w += d.CW[k]; e.src.set(s, (e.src.get(s) || 0) + d.CW[k]);
      m.set(key, e);
    }
    // Words that some message says at almost every position ("whilst", …) are the messages' default
    // readout, not content: weight each word by how specific it is to the positions it appears at.
    const df = new Map(), n = Math.max(1, T - 1);
    for (const m of per.values()) for (const k of m.keys()) df.set(k, (df.get(k) || 0) + 1);
    for (let t = 1; t < T; t++) {
      const m = per.get(t) || new Map();
      cols.push({ t, items: [...m.entries()].map(([key, e]) => {
        const idf = Math.log((n + 1) / (df.get(key) || 1));
        return { key: "c" + key, label: e.label, w: e.w * idf, hue: hashHue(key), src: e.src };
      }) });
    }
  }
  return cols;
}

function draw() {
  const d = raw; if (!d) return;
  const svg = $("riversvg"), wrap = $("riverscroll");
  const T = d.T, cols = columns(d), maxItems = +$("rvN").value;
  // keep the strongest items globally (concepts) or per column (sources), the rest go grey
  let keep = null;
  if ($("rvMode").value === "concept") {
    const tot = new Map();
    for (const c of cols) for (const it of c.items) tot.set(it.key, (tot.get(it.key) || 0) + it.w / (c.items.reduce((a, b) => a + b.w, 0) || 1));
    keep = new Set([...tot.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxItems).map((x) => x[0]));
  }
  const H = Math.max(260, wrap.clientHeight - 18), top = 34, bottom = 46, gap = 2, bar = 8;  // room for a scrollbar
  const colW = Math.max(74, Math.min(150, (wrap.clientWidth - 40) / Math.max(1, T - 1)));
  const W = 30 + colW * (T - 1) + 90;
  svg.setAttribute("width", W); svg.setAttribute("height", H);
  svg.innerHTML = "";
  const X = (t) => 30 + colW * (t - 1) + colW * 0.3;
  const avail = H - top - bottom;
  // layout each column: sorted stack, heights ∝ share
  const lay = cols.map((c) => {
    const total = c.items.reduce((a, b) => a + b.w, 0) || 1;
    let items = c.items.filter((it) => it.w > 0).sort((a, b) => b.w - a.w);
    const shown = keep ? items.filter((it) => keep.has(it.key)) : items.slice(0, maxItems);
    const shownW = shown.reduce((a, b) => a + b.w, 0), restW = total - shownW;
    // sources: heights = share of everything read (rest in grey); concepts: share of the shown
    // concepts (the long tail of other words is noted under the column instead)
    const denom = keep ? shownW || 1 : total;
    const list = shown.map((it) => ({ ...it, share: it.w / denom }));
    if (!keep && restW / total > 0.002) list.push({ key: "rest", label: "rest", w: restW, share: restW / total, rest: true });
    const n = list.length, h = avail - gap * Math.max(0, n - 1);
    let y = top;
    for (const it of list) { it.y0 = y; it.y1 = y + Math.max(0.5, it.share * h); y = it.y1 + gap; }
    return { t: c.t, list, total, other: keep ? restW / total : 0 };
  });
  const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  const clip = el("clipPath", { id: "rvclip" }, el("defs", {}));
  const clipRect = el("rect", { x: 0, y: 0, width: W, height: H }, clip);
  const g = el("g", { "clip-path": "url(#rvclip)" });
  // ribbons between consecutive columns
  for (let k = 0; k + 1 < lay.length; k++) {
    const A = lay[k], B = lay[k + 1], x1 = X(A.t) + bar / 2, x2 = X(B.t) - bar / 2, xm = (x1 + x2) / 2;
    const bmap = new Map(B.list.map((it) => [it.key, it]));
    for (const a of A.list) {
      const b = bmap.get(a.key);
      if (!b || a.rest) continue;
      const p = `M${x1},${a.y0} C${xm},${a.y0} ${xm},${b.y0} ${x2},${b.y0} L${x2},${b.y1} C${xm},${b.y1} ${xm},${a.y1} ${x1},${a.y1} Z`;
      const path = el("path", { d: p, fill: `hsl(${a.hue} 75% 58%)`, opacity: 0.32, class: "rvrib" }, g);
      path.dataset.key = a.key;
    }
  }
  // births (source mode): a thread from each token on the axis to the first column that reads it
  const axisX = (t) => (t === 0 ? X(1) - colW * 0.5 : X(t));
  if ($("rvMode").value === "source") {
    const seen = new Set();
    for (const c of lay) for (const it of c.list) {
      if (it.rest || seen.has(it.s)) continue;
      seen.add(it.s);
      const x0 = axisX(it.s), y0 = H - bottom + 14, x1 = X(c.t) - bar / 2, y1 = (it.y0 + it.y1) / 2;
      el("path", { d: `M${x0},${y0} C${x0},${y0 - 30} ${x1 - 30},${y1} ${x1},${y1}`, fill: "none",
        stroke: `hsl(${it.hue} 75% 58%)`, "stroke-width": 1.2, opacity: 0.55, "stroke-dasharray": "2 3" }, g);
    }
  }
  // nodes and labels
  for (const c of lay) {
    const x = X(c.t);
    for (const it of c.list) {
      const r = el("rect", { x: x - bar / 2, y: it.y0, width: bar, height: Math.max(0.5, it.y1 - it.y0), fill: it.rest ? "var(--line)" : `hsl(${it.hue} 75% 55%)`, class: "rvnode", rx: 2 }, g);
      r.dataset.key = it.key; r.dataset.t = c.t;
      if (it.y1 - it.y0 >= 11 && !it.rest) {
        const tx = el("text", { x: x + bar / 2 + 3, y: (it.y0 + it.y1) / 2 + 3.5, class: "rvlab" }, g);
        tx.textContent = `${it.label} ${(it.share * 100).toFixed(0)}%`;
      }
    }
  }
  if ($("rvMode").value === "concept") for (const c of lay) {
    const e = el("text", { x: X(c.t), y: H - bottom + 12, "text-anchor": "middle", class: "rvpred" }, g);
    e.textContent = c.list.length ? `+${(c.other * 100).toFixed(0)}% other` : "—";
  }
  // axis: the token stream, with what the model predicts next at each position above
  const last = UI.data.layers.length - 1;
  for (let t = 0; t < T; t++) {
    const x = axisX(t), hue = posHue(T > 1 ? t / (T - 1) : 0);
    const lab = el("text", { x, y: H - bottom + 30, "text-anchor": "middle", class: "rvtok", fill: `hsl(${hue} 80% 62%)` }, g);
    lab.textContent = tok(d.tokens[t]); lab.dataset.t = t;
    const pred = UI.data.cells[last][t]?.ids[0];
    if (pred !== undefined && t > 0) {
      const pr = el("text", { x, y: 16, "text-anchor": "middle", class: "rvpred" }, g);
      pr.textContent = `→ ${tok(UI.data.vocab[pred])}`;
    }
  }
  el("text", { x: 4, y: 16, class: "rvpred" }).textContent = "next:";
  draw._clip = { rect: clipRect, X, colW, W };
  applyReveal();
  draw._lay = lay;
  const [lo, hi] = band();
  $("rvtitle").innerHTML = `Each column: what that token reads from earlier positions in layers <b>${lo}–${hi}</b>, all heads, sorted (top = most). ` +
    ($("rvMode").value === "source" ? "Ribbons follow each source token; dotted threads show when a token first becomes available." : "Ribbons follow each meaning (the J-lens words of the incoming messages, weighted by how specific they are to that position); colours are per word.") +
    ` <span class="muted">Heights = ${$("rvMode").value === "source" ? "share of what it reads" : "share among the words shown"}${$("rvPrev").checked ? ", previous token excluded" : ""}; its own position is excluded · ${d.ms} ms</span>`;
}

function applyReveal() {
  const c = draw._clip; if (!c) return;
  c.rect.setAttribute("width", reveal === Infinity ? c.W : Math.max(0, c.X(reveal) + c.colW * 0.45));
}

function stop() { playing = false; clearTimeout(timer); $("rvPlay").textContent = "▶"; }
function tick() {
  if (!playing || !raw) return;
  reveal += 1;
  applyReveal();
  if (reveal >= raw.T - 1) { stop(); reveal = Infinity; applyReveal(); return; }
  timer = setTimeout(tick, 650 / +$("rvSpeed").value);
}
$("rvPlay").addEventListener("click", () => {
  if (!raw) return;
  if (playing) { stop(); return; }
  reveal = 0; applyReveal(); playing = true; $("rvPlay").textContent = "⏸"; timer = setTimeout(tick, 250);
});

// hover: explain a node
const tip = $("rvtip");
$("riversvg").addEventListener("mousemove", (e) => {
  const n = e.target.closest(".rvnode, .rvrib");
  if (!n || !raw || !draw._lay) { tip.style.display = "none"; highlight(null); return; }
  const key = n.dataset.key;
  highlight(key);
  const t = n.dataset.t !== undefined ? +n.dataset.t : null;
  if (t === null) { tip.style.display = "none"; return; }
  const col = draw._lay.find((c) => c.t === t), it = col?.list.find((x) => x.key === key);
  if (!it) { tip.style.display = "none"; return; }
  let html = `<b>${UI.esc(tok(raw.tokens[t]))}</b> <span class="muted">(pos ${t})</span> reads <b>${(it.share * 100).toFixed(1)}%</b> of its incoming messages ` +
    (it.rest ? "from everything not shown" : $("rvMode").value === "source" ? `from <b>${UI.esc(it.label)}</b> (pos ${it.s})` : `as <b>${UI.esc(it.label)}</b>`);
  if ($("rvMode").value === "source" && !it.rest) {  // what those messages say
    const [lo, hi] = band(), words = new Map();
    for (let k = 0; k < raw.CW.length; k++) {
      if (raw.C[4 * k + 1] !== t || raw.C[4 * k + 2] !== it.s) continue;
      const l = raw.C[4 * k]; if (l < lo || l > hi) continue;
      const w = raw.vocab[raw.C[4 * k + 3]]; if (!meaningful(w)) continue;
      words.set(conceptKey(w), (words.get(conceptKey(w)) || 0) + raw.CW[k]);
    }
    const top = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map((x) => UI.esc(x[0]));
    if (top.length) html += `<div>the messages say: <b>${top.join(" · ")}</b></div>`;
  } else if (it.src) {
    const tot = [...it.src.values()].reduce((a, b) => a + b, 0) || 1;
    const top = [...it.src.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s, w]) => `${UI.esc(tok(raw.tokens[s]))} ${(w / tot * 100).toFixed(0)}%`);
    html += `<div>carried from: <b>${top.join(" · ")}</b></div>`;
  }
  html += `<div class="muted">click to open this position in the grid</div>`;
  tip.innerHTML = html; tip.style.display = "block";
  const r = $("riverwrap").getBoundingClientRect();
  tip.style.left = Math.min(r.width - 300, e.clientX - r.left + 14) + "px"; tip.style.top = (e.clientY - r.top + 14) + "px";
});
$("riversvg").addEventListener("mouseleave", () => { tip.style.display = "none"; highlight(null); });
function highlight(key) {
  if (highlight._k === key) return; highlight._k = key;
  for (const p of $("riversvg").querySelectorAll(".rvrib")) p.setAttribute("opacity", key === null ? 0.32 : p.dataset.key === key ? 0.75 : 0.08);
}
$("riversvg").addEventListener("click", (e) => {
  const n = e.target.closest("[data-t]"); if (!n || !UI.data) return;
  const [lo, hi] = band(), mid = Math.round((lo + hi) / 2);
  const li = UI.data.layers.indexOf(mid);
  if (li >= 0) UI.selectCell(li, +n.dataset.t, { scroll: true });
});

async function refresh() {
  if (!active) return;
  const d = await load();
  if (d) draw();
}
for (const id of ["rvMode", "rvBand", "rvPrev", "rvN", "rvLo", "rvHi"]) $(id).addEventListener("change", () => {
  $("rvCustom").style.display = $("rvBand").value === "custom" ? "" : "none";
  if (raw) draw();
});
let lastSize = "";
new ResizeObserver(() => {  // redraw when the scroll area changes size (not when the svg inside it does)
  const w = $("riverscroll"), k = `${w.clientWidth}x${w.clientHeight}`;
  if (active && raw && k !== lastSize) { lastSize = k; draw(); }
}).observe($("riverscroll"));
window.addEventListener("lens:view", (e) => { active = e.detail === "river"; if (!active) stop(); else refresh(); });
window.addEventListener("lens:data", () => { raw = null; stop(); reveal = Infinity; if (active) refresh(); });
window.lensRiver = { get raw() { return raw; }, draw };
