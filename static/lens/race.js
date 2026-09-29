// Logit race: how every write into the residual stream adds up to the final choice (see
// bonsai_lens/race.py). Axes are logit differences between the chosen candidate and two rivals,
// so contributions add exactly, tip to tail, and the part shared by all candidates drops out.
const UI = window.lensUI;
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";

let active = false, res = null, req = 0, step = -1, playing = false, timer = null, hover = null;
const cache = new Map();

const esc = (s) => UI.esc(s);
const tok = (s) => UI.show(s).trim() || "·";
const layerCol = (l, L) => `hsl(${(200 + 215 * (l / Math.max(1, L - 1))) % 360} 85% 58%)`;
const fmt = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(3);

// margins of the chosen candidate over each rival for a contribution vector over candidates
const diff = (v) => [v[0] - v[1], v[0] - v[2]];

function setStatus(html) {
  const el = $("racestatus");
  el.style.display = html ? "flex" : "none";
  el.innerHTML = html || "";
}

async function refresh() {
  if (!active) return;
  const data = UI.data;
  if (!data) { setStatus("Run a prompt first."); return; }
  if (data.knockout) { setStatus("The race is computed for the original run, not the knockout view."); return; }
  const last = data.layers.length - 1;
  const t = UI.sel ? UI.sel[1] : data.tokens.length - 1;
  // candidate pickers: the model's top 10 at this position
  const c = data.cells[last][t];
  const opts = c.ids.map((id, k) => `<option value="${id}">${esc(UI.show(data.vocab[id]))} · ${(c.p[k] * 100).toFixed(1)}%</option>`).join("");
  const key0 = `${data.ids.length}:${t}`;
  if ($("raceC0").dataset.key !== key0) {
    for (const [id, k] of [["raceC0", 0], ["raceC1", 1], ["raceC2", 2]]) { $(id).innerHTML = opts; $(id).value = String(c.ids[k]); $(id).dataset.key = key0; }
  }
  const cands = [$("raceC0").value, $("raceC1").value, $("raceC2").value];
  if (new Set(cands).size < 3) { setStatus("Choose three different tokens."); return; }
  const key = `${data.ids.join(",")}|${t}|${cands}`;
  const my = ++req;
  let d = cache.get(key);
  if (!d) {
    setStatus(`Decomposing every layer's writes into position ${t} (${esc(UI.show(data.tokens[t]))})…`);
    d = await (await fetch(`/api/race?t=${t}&cands=${cands.join(",")}`)).json();
    if (my !== req) return;
    if (d.error || d.detail) { setStatus(esc(d.error || JSON.stringify(d.detail))); return; }
    cache.set(key, d);
  }
  setStatus("");
  res = d;
  prepare(d);
  step = Math.min(step < 0 ? d.layers.length - 1 : step, d.layers.length - 1);
  $("raceStep").max = d.layers.length - 1; $("raceStep").value = step;
  draw();
}

// Cumulative points: start at the embedding's contribution, then per layer attention, then MLP.
function prepare(d) {
  let p = diff(d.emb);
  d.pts = [{ p, l: -1, part: "emb" }];
  for (const L of d.layers) {
    const a = [p[0] + diff(L.attn)[0], p[1] + diff(L.attn)[1]];
    const m = [a[0] + diff(L.mlp)[0], a[1] + diff(L.mlp)[1]];
    L.start = p; L.mid = a; L.end = m;
    d.pts.push({ p: a, l: L.l, part: "attn" }, { p: m, l: L.l, part: "mlp" });
    p = m;
  }
}

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

// Fit a set of points into an svg of size W x H (equal scale on both axes, y up).
function frameFor(points, W, H, pad = 36) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const span = Math.max(x1 - x0, y1 - y0, 1e-3);
  const s = Math.min((W - 2 * pad) / Math.max(x1 - x0, span * 0.25), (H - 2 * pad) / Math.max(y1 - y0, span * 0.25));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return { X: (x) => W / 2 + (x - cx) * s, Y: (y) => H / 2 - (y - cy) * s, s, x0, x1, y0, y1 };
}

function arrow(svg, a, b, F, color, width, opts = {}) {
  const line = el("line", { x1: F.X(a[0]), y1: F.Y(a[1]), x2: F.X(b[0]), y2: F.Y(b[1]), stroke: color,
    "stroke-width": width, "marker-end": opts.head === false ? "" : `url(#${opts.marker || "rah"})`, opacity: opts.opacity ?? 1 }, svg);
  if (opts.dash) line.setAttribute("stroke-dasharray", opts.dash);
  if (opts.title) el("title", {}, line).textContent = opts.title;
  if (opts.data) line.dataset.piece = opts.data;
  return line;
}

function defs(svg) {
  const d = el("defs", {}, svg);
  const mk = (id, color) => {
    const m = el("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto-start-reverse" }, d);
    el("path", { d: "M0,0 L10,5 L0,10 z", fill: color }, m);
  };
  mk("rah", "currentColor"); mk("rahw", "var(--ink)"); mk("rahg", "#888");
}

function draw() {
  if (!res) return;
  const d = res, L = d.layers.length, cur = d.layers[step];
  const names = d.cand_str.map(tok);
  drawMain(d, L, cur, names);
  drawDetail(d, cur, names);
  drawStrip(d, L, names);
  const fin = diff(d.actual);
  $("racetitle").innerHTML = `Into position <b>${d.t}</b> (${esc(UI.show(d.tokens[d.t]))}): <b>${esc(names[0])}</b> vs <b>${esc(names[1])}</b> and <b>${esc(names[2])}</b> · final margins ${fmt(fin[0])} / ${fmt(fin[1])} logits` +
    ` · <span class="muted">exact direct attribution: the pieces sum to the real logits (largest error ${d.max_piece_err}) · ${d.ms} ms</span>`;
  $("raceLab").textContent = `L${cur.l} ${cur.kind === "gdn" ? "memory" : "attention"}`;
}

function drawMain(d, L, cur, names) {
  const svg = $("racemain");
  const W = svg.clientWidth || 600, H = svg.clientHeight || 400;
  svg.innerHTML = ""; defs(svg);
  const pts = d.pts.map((x) => x.p).concat([[0, 0]]);
  const F = frameFor(pts, W, H);
  // regions: who is winning where (x = c0 - c1, y = c0 - c2)
  const big = 1e4;
  const poly = (ps, fill) => el("polygon", { points: ps.map(([x, y]) => `${F.X(x)},${F.Y(y)}`).join(" "), fill, opacity: 0.09 }, svg);
  poly([[0, 0], [big, 0], [big, big], [0, big]], "hsl(150 70% 45%)");         // c0 ahead of both
  poly([[0, 0], [-big, -big], [-big, big], [0, big]], "hsl(30 90% 55%)");     // c1 ahead (x<0 and y>x)
  poly([[0, 0], [big, 0], [big, -big], [-big, -big]], "hsl(270 70% 60%)");    // c2 ahead (y<0 and y<x)
  const axis = (a, b) => el("line", { x1: F.X(a[0]), y1: F.Y(a[1]), x2: F.X(b[0]), y2: F.Y(b[1]), stroke: "var(--muted)", "stroke-width": 0.8, "stroke-dasharray": "3 4" }, svg);
  axis([0, -big], [0, big]); axis([-big, 0], [big, 0]); axis([-big, -big], [big, big]);
  const lab = (x, y, text, anchor = "middle") => { const e = el("text", { x, y, "text-anchor": anchor, class: "rlab" }, svg); e.textContent = text; };
  lab(W - 10, 18, `${names[0]} ahead`, "end");
  lab(12, 18, `${names[1]} ahead`, "start");
  lab(W - 10, H - 10, `${names[2]} ahead`, "end");
  lab(12, H - 10, "solid = attention/memory · dashed = MLP", "start");
  lab(F.X(0) + 4, F.Y(0) - 6, "tie", "start");
  // trajectory: every layer's net attention and MLP arrow, tip to tail
  el("circle", { cx: F.X(d.pts[0].p[0]), cy: F.Y(d.pts[0].p[1]), r: 3.5, fill: "var(--ink)" }, svg);
  for (const Ly of d.layers) {
    const future = Ly.l > cur.l, col = layerCol(Ly.l, L), on = Ly.l === cur.l;
    const o = future ? 0.12 : on ? 1 : 0.75;
    arrow(svg, Ly.start, Ly.mid, F, col, on ? 3 : 1.6, { opacity: o, head: on, title: `L${Ly.l} ${Ly.kind === "gdn" ? "memory" : "attention"}: ${fmt(diff(Ly.attn)[0])} / ${fmt(diff(Ly.attn)[1])}` }).style.color = col;
    arrow(svg, Ly.mid, Ly.end, F, col, on ? 3 : 1.6, { opacity: o, head: on, dash: "4 2", title: `L${Ly.l} MLP: ${fmt(diff(Ly.mlp)[0])} / ${fmt(diff(Ly.mlp)[1])}` }).style.color = col;
  }
  const e = cur.end;
  el("circle", { cx: F.X(e[0]), cy: F.Y(e[1]), r: 5, fill: "none", stroke: "var(--ink)", "stroke-width": 2 }, svg);
  lab(F.X(e[0]) + 8, F.Y(e[1]) + 4, `after L${cur.l}`, "start");
  // axis names on the axes themselves (clamped into view)
  const cx = Math.min(W - 12, Math.max(12, F.X(0))), cy = Math.min(H - 30, Math.max(40, F.Y(0)));
  const ax = el("text", { x: W - 12, y: cy - 6, "text-anchor": "end", class: "rlab muted" }, svg);
  ax.textContent = `lead over ${names[1]} →`;
  const ay = el("text", { x: cx + 6, y: 40, class: "rlab muted" }, svg);
  ay.textContent = `↑ lead over ${names[2]}`;
}

// The current layer's two arrows, split into their largest pieces, tip to tail, zoomed to fit.
function drawDetail(d, cur, names) {
  const svg = $("racedetail");
  const W = svg.clientWidth || 360, H = svg.clientHeight || 260;
  svg.innerHTML = ""; defs(svg);
  const segs = [];
  let p = [0, 0];
  const push = (v, kind, label, key) => { const q = [p[0] + v[0], p[1] + v[1]]; segs.push({ a: p, b: q, kind, label, key }); p = q; };
  cur.attn_top.forEach((x, k) => push(diff(x.v), "attn", `head ${x.h} ← ${tok(d.tokens[x.s])}${x.s === d.t ? " (itself)" : ""}`, `a${k}`));
  push(diff(cur.attn_rest), "attn-rest", "all other heads/sources", "ar");
  const aEnd = p;
  cur.mlp_top.forEach((x, k) => push(diff(x.v), "mlp", `neuron ${x.i}`, `m${k}`));
  push(diff(cur.mlp_rest), "mlp-rest", "all other neurons", "mr");
  const F = frameFor(segs.flatMap((s) => [s.a, s.b]).concat([[0, 0]]), W, H, 28);
  el("line", { x1: F.X(0), y1: 0, x2: F.X(0), y2: H, stroke: "var(--line)" }, svg);
  el("line", { x1: 0, y1: F.Y(0), x2: W, y2: F.Y(0), stroke: "var(--line)" }, svg);
  for (const s of segs) {
    const isA = s.kind.startsWith("attn"), rest = s.kind.endsWith("rest");
    const col = rest ? "#888" : isA ? "#ff9d57" : "#57d0ff";
    const ln = arrow(svg, s.a, s.b, F, col, hover === s.key ? 3.5 : 2, { marker: rest ? "rahg" : "rah", dash: rest ? "3 3" : "", title: `${s.label}: ${fmt(s.b[0] - s.a[0])} / ${fmt(s.b[1] - s.a[1])}`, data: s.key });
    ln.style.color = col;
  }
  el("circle", { cx: F.X(0), cy: F.Y(0), r: 3, fill: "var(--ink)" }, svg);
  el("circle", { cx: F.X(aEnd[0]), cy: F.Y(aEnd[1]), r: 2.5, fill: "#ff9d57" }, svg);
  const t = el("text", { x: 8, y: 14, class: "rlab" }, svg);
  t.textContent = `L${cur.l} zoomed: orange = ${cur.kind === "gdn" ? "memory" : "attention"} pieces, blue = MLP neurons, grey = the rest`;
  // piece list
  const row = (x, kind, key, label, extra) => {
    const v = diff(x.v ?? x);
    return `<div class="rrow ${kind}" data-piece="${key}"><span class="rl">${label}</span><span class="rv">${fmt(v[0])}</span><span class="rv">${fmt(v[1])}</span>${extra ? `<div class="rx">${extra}</div>` : ""}</div>`;
  };
  const hdr = `<div class="rrow hdr"><span class="rl"></span><span class="rv">vs ${esc(names[1])}</span><span class="rv">vs ${esc(names[2])}</span></div>`;
  $("racelist").innerHTML = hdr +
    row(cur.attn, "tot", "", `<b>${cur.kind === "gdn" ? "memory" : "attention"} total</b>`) +
    cur.attn_top.map((x, k) => row(x, "attn", `a${k}`, `head ${x.h} ← <b data-src="${x.s}">${esc(tok(d.tokens[x.s]))}</b>${x.s === d.t ? " <i>(itself)</i>" : ` <i>pos ${x.s}</i>`}`)).join("") +
    row(cur.attn_rest, "rest", "ar", "other heads / sources") +
    row(cur.mlp, "tot", "", "<b>MLP total</b>") +
    cur.mlp_top.map((x, k) => row(x, "mlp", `m${k}`, `neuron ${x.i} <i>× ${x.act}</i>`,
      x.up ? `writes toward <b>${x.up.map((w) => esc(tok(w))).join(" ")}</b>, away from ${x.down.map((w) => esc(tok(w))).join(" ")} <i>(its direct vote; ${x.act < 0 ? "negative activation flips it" : "scaled by its activation"})</i>` : "")).join("") +
    row(cur.mlp_rest, "rest", "mr", "other neurons");
}

// Margins over layers: where does the decision happen?
function drawStrip(d, L, names) {
  const svg = $("racestrip");
  const W = svg.clientWidth || 600, H = svg.clientHeight || 90;
  svg.innerHTML = "";
  const ys = d.layers.map((x) => x.end);
  const all = ys.flat().concat([0, ...diff(d.emb)]);
  const lo = Math.min(...all), hi = Math.max(...all), pad = 14;
  const X = (l) => pad + ((l + 1) / L) * (W - 2 * pad), Y = (v) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - 2 * pad);
  el("line", { x1: pad, x2: W - pad, y1: Y(0), y2: Y(0), stroke: "var(--muted)", "stroke-dasharray": "3 3" }, svg);
  const path = (k, col) => {
    const pts = [[X(-1), Y(diff(d.emb)[k])], ...d.layers.map((x) => [X(x.l), Y(x.end[k])])];
    el("polyline", { points: pts.map((p) => p.join(",")).join(" "), fill: "none", stroke: col, "stroke-width": 1.8 }, svg);
  };
  path(0, "#ff9d57"); path(1, "#b58cff");
  el("line", { x1: X(step), x2: X(step), y1: 0, y2: H, stroke: "var(--ink)", "stroke-width": 1, opacity: 0.6 }, svg);
  const lab = (x, y, text, col) => { const e = el("text", { x, y, class: "rlab", fill: col }, svg); e.textContent = text; };
  lab(pad, 11, `margin over ${names[1]}`, "#ff9d57");
  lab(pad + 150, 11, `margin over ${names[2]}`, "#b58cff");
  lab(W - pad - 100, H - 3, "layer 0 → 63", "var(--muted)");
  svg.onclick = (e) => { const r = svg.getBoundingClientRect(); setStep(Math.round(((e.clientX - r.left - pad) / (W - 2 * pad)) * L - 1)); };
}

function setStep(s) {
  if (!res) return;
  step = Math.max(0, Math.min(res.layers.length - 1, s));
  $("raceStep").value = step;
  draw();
}
function stop() { playing = false; clearTimeout(timer); $("racePlay").textContent = "▶"; }
function tick() {
  if (!playing || !res) return;
  if (step >= res.layers.length - 1) { stop(); return; }
  setStep(step + 1);
  timer = setTimeout(tick, 700 / +$("raceSpeed").value);
}
$("racePlay").addEventListener("click", () => {
  if (!res) return;
  if (playing) { stop(); return; }
  if (step >= res.layers.length - 1) setStep(0);
  playing = true; $("racePlay").textContent = "⏸"; timer = setTimeout(tick, 300);
});
$("raceStep").addEventListener("input", (e) => { stop(); setStep(+e.target.value); });
for (const id of ["raceC0", "raceC1", "raceC2"]) $(id).addEventListener("change", () => { stop(); refresh(); });
$("racelist").addEventListener("mouseover", (e) => { const r = e.target.closest(".rrow"); const k = r?.dataset.piece || null; if (k !== hover) { hover = k; if (res) drawDetail(res, res.layers[step], res.cand_str.map(tok)); } });
$("racelist").addEventListener("click", (e) => {  // click a source token: select that layer/position in the grid
  const b = e.target.closest("[data-src]"); if (!b || !res) return;
  const li = UI.data.layers.indexOf(res.layers[step].l);
  if (li >= 0) UI.selectCell(li, res.t);
});
new ResizeObserver(() => { if (active && res) draw(); }).observe($("racewrap"));
window.addEventListener("lens:view", (e) => { active = e.detail === "race"; if (!active) stop(); else refresh(); });
window.addEventListener("lens:select", () => { if (active) { const t = UI.sel?.[1]; if (!res || t !== res.t) { stop(); step = -1; refresh(); } } });
window.addEventListener("lens:data", () => { cache.clear(); res = null; step = -1; if (active) refresh(); });
window.lensRace = { get res() { return res; }, setStep };
