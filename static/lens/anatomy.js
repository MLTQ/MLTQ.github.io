// Anatomy: every block of the model as a disc, strung in order on a stalk.
//   area    = parameters (core = the mixer: attention or DeltaNet memory; ring = the MLP)
//   tone    = the real stored ternary weights (-1 / 0 / +1), sampled from each matrix
//   hue     = meaning: ring slots hold neurons sorted by where their J-lens vote lands on the Space
//             map; core sectors are heads (orange = attention, blue = memory)
//   alpha   = activity for the selected token: neurons' |activation| x |write|, heads' share of reads
//   ripples = how much the block changed that token's residual stream, travelling down the stack
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const UI = window.lensUI;
const $ = (id) => document.getElementById(id);

let active = false, stat = null, act = null, t = 0, playing = false, timer = null, rafId = 0;
let layout = null, discCache = new Map(), ripples = [];

const b64 = (s) => new Uint8Array(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer);
const tok = (s) => UI.show(s).trim() || "·";
const TONE = [0.2, 0.44, 0.74];  // lightness for codes 0/1/2 = weights -1/0/+1

function hsl2rgb(h, s, l) {
  h /= 360;
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);

function status(html) { const el = $("anatstatus"); el.style.display = html ? "flex" : "none"; el.innerHTML = html || ""; }

async function loadStatic() {
  if (stat) return stat;
  status("Loading the model's anatomy…");
  const d = await (await fetch("/api/anatomy")).json();
  if (d.error || d.detail) { status(UI.esc(d.error || JSON.stringify(d.detail))); return null; }
  for (const b of d.blocks) {
    b.ringA = b64(b.ring);
    b.coreA = Object.fromEntries(Object.entries(b.core_tex).map(([k, v]) => [k, b64(v)]));
    const core = Object.values(b.core).reduce((a, c) => a + c, 0), mlp = Object.values(b.mlp).reduce((a, c) => a + c, 0);
    b.params = core + mlp + b.small; b.coreP = core; b.mlpP = mlp;
  }
  for (const k of ["embed", "head"]) d[k].texA = b64(d[k].tex);
  stat = d; status("");
  return d;
}
async function loadAct() {
  const data = UI.data;
  if (!data || data.knockout) { act = null; return null; }
  if (act && act._data === data) return act;
  const t0 = performance.now();
  const tick = () => status(`Measuring every block's activity for each token… ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  tick(); const iv = setInterval(tick, 1000);
  try {
    const d = await (await fetch("/api/anatomy_act")).json();
    if (d.error || d.detail) { status(UI.esc(d.error || JSON.stringify(d.detail))); return null; }
    d.ringA = b64(d.ring); d.headA = b64(d.head); d._data = data;
    act = d; status("");
    return d;
  } finally { clearInterval(iv); }
}

// ---------------------------------------------------------------- layout
function computeLayout() {
  const wrap = $("anatscroll"), W = wrap.clientWidth - 16, C = 8;
  const cell = W / C, rBase = cell * 0.4;
  const rOf = (p) => rBase * Math.sqrt(p / stat.blocks[0].params);
  const items = [];
  const bigR = rOf(stat.embed.params);
  const top = bigR * 2 + 40;
  items.push({ kind: "embed", x: bigR + 20, y: top / 2 + 6, r: bigR });
  for (let l = 0; l < stat.L; l++) {
    const row = Math.floor(l / C), col = row % 2 ? C - 1 - (l % C) : l % C;
    items.push({ kind: "block", l, x: cell * (col + 0.5) + 8, y: top + cell * (row + 0.5), r: rOf(stat.blocks[l].params) });
  }
  const rows = Math.ceil(stat.L / C);
  items.push({ kind: "head", x: W - bigR - 12, y: top + cell * rows + bigR + 24, r: bigR });
  return { W, H: top + cell * rows + bigR * 2 + 50, items, cell };
}

// ---------------------------------------------------------------- one disc as pixels
function renderDisc(it, dpr) {
  const R = Math.ceil(it.r * dpr), size = 2 * R + 2;
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(size, size), px = img.data;
  const useAct = $("anatAct").checked && act;
  if (it.kind !== "block") {  // embedding / output head: token slots sorted by map angle
    const D = stat[it.kind], S = D.slots, n = D.n;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x - R - 1, dy = y - R - 1, rr = Math.hypot(dx, dy) / R;
      if (rr > 1) continue;
      const k = Math.min(S - 1, Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * S));
      const code = D.texA[k * n + (hash(x, y) % n)];
      const [r, g, b] = hsl2rgb(D.slot_hue[k], 0.25 + 0.6 * D.slot_sat[k], TONE[code]);
      const o = 4 * (y * size + x); px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 235;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
  const B = stat.blocks[it.l], S = stat.slots, RS = stat.ring_samples, CS = stat.core_samples, H = B.heads;
  const rc = Math.sqrt(B.coreP / (B.coreP + B.mlpP));
  const bands = Object.keys(B.core), bandP = bands.map((k) => B.core[k]), tot = bandP.reduce((a, c) => a + c, 0);
  const coreEdges = []; let acc = 0; for (const p of bandP) { acc += p; coreEdges.push(rc * Math.sqrt(acc / tot)); }
  const ringEdges = [1, 2, 3].map((j) => Math.sqrt(rc * rc + (1 - rc * rc) * (j / 3)));
  const ringAct = useAct ? act.ringA.subarray((it.l * act.T + t) * S, (it.l * act.T + t + 1) * S) : null;
  const headAct = useAct ? act.headA.subarray((it.l * act.T + t) * 48, (it.l * act.T + t + 1) * 48) : null;
  const coreHue = B.kind === "attn" ? 25 : 200;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - R - 1, dy = y - R - 1, rr = Math.hypot(dx, dy) / R;
    if (rr > 1) continue;
    const a01 = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI), h = hash(x, y);
    let rgb, alpha;
    if (rr <= rc) {
      const head = Math.min(H - 1, Math.floor(a01 * H));
      let band = 0; while (band < bands.length - 1 && rr > coreEdges[band]) band++;
      const code = B.coreA[bands[band]][head * CS + (h % CS)];
      rgb = hsl2rgb(coreHue + ((head % 6) - 2.5) * 4, 0.7, TONE[code]);
      alpha = headAct ? 0.1 + 0.9 * Math.sqrt(headAct[head] / 255) : 0.92;
    } else {
      const k = Math.min(S - 1, Math.floor(a01 * S));
      let band = 0; while (band < 2 && rr > ringEdges[band]) band++;
      const code = B.ringA[(k * 3 + band) * RS + (h % RS)];
      rgb = hsl2rgb(B.slot_hue[k], 0.2 + 0.7 * B.slot_sat[k], TONE[code]);
      alpha = ringAct ? 0.08 + 0.92 * Math.sqrt(ringAct[k] / 255) : 0.92;
    }
    const o = 4 * (y * size + x); px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = 255 * alpha;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// ---------------------------------------------------------------- draw
const cylMode = () => $("anatShape").value === "cylinder";
function draw() {
  if (!stat) return;
  $("anatscroll").style.display = cylMode() ? "none" : "";
  $("anat3d").style.display = cylMode() ? "block" : "none";
  if (cylMode()) { draw3d(); return; }
  layout = computeLayout();
  const dpr = devicePixelRatio || 1, cv = $("anatcanvas"), ov = $("anatripple");
  for (const c of [cv, ov]) { c.width = layout.W * dpr; c.height = layout.H * dpr; c.style.width = layout.W + "px"; c.style.height = layout.H + "px"; }
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, layout.W, layout.H);
  const ink = UI.css("--muted") || "#888";
  // the stalk through every disc, in order
  ctx.strokeStyle = ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; ctx.beginPath();
  layout.items.forEach((it, i) => (i ? ctx.lineTo(it.x, it.y) : ctx.moveTo(it.x, it.y)));
  ctx.stroke(); ctx.globalAlpha = 1;
  const key = `${$("anatAct").checked && act ? t : "static"}:${layout.cell.toFixed(1)}:${dpr}`;
  for (const it of layout.items) {
    const k = `${it.kind}${it.l ?? ""}:${key}`;
    let img = discCache.get(k);
    if (!img) { img = renderDisc(it, dpr); discCache.set(k, img); }
    ctx.drawImage(img, it.x - it.r - 1 / dpr, it.y - it.r - 1 / dpr, img.width / dpr, img.height / dpr);
    ctx.fillStyle = UI.css("--ink"); ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    if (it.kind === "block") {
      const B = stat.blocks[it.l];
      ctx.fillText(`L${it.l}${B.kind === "attn" ? " · attn" : ""}`, it.x, it.y + it.r + 12);
      if (act && $("anatAct").checked) {
        ctx.fillStyle = UI.css("--muted");
        ctx.fillText(`${act.n90[it.l][t]}n · ${act.h90[it.l][t]}h`, it.x, it.y + it.r + 23);
      }
    } else {
      ctx.fillText(`${stat[it.kind].name} · ${(stat[it.kind].params / 1e9).toFixed(2)}B`, it.x, it.y + it.r + 14);
    }
  }
  if (discCache.size > 400) discCache = new Map([...discCache].slice(-200));
  // caption, in the spirit of a museum label
  const em = layout.items[0];
  const tx = em.x + em.r + 24;
  ctx.textAlign = "left"; ctx.fillStyle = UI.css("--ink"); ctx.font = "12px ui-monospace, monospace";
  const lines = [
    `One disc a block, strung in order on the stalk: ${(stat.total / 1e9).toFixed(1)}B parameters.`,
    `Area is parameters: the core is the mixer (attention, or the memory), the ring the MLP.`,
    `Tone is the real weights, three levels: each weight is −1, 0 or +1 (times a scale).`,
    `Colour is meaning: MLP neurons sit around the ring by where their write lands on the`,
    `word map; core sectors are heads, orange attention, blue memory.`,
    act && $("anatAct").checked ? `Light is use: how active each neuron / head is for “${tok(act.tokens[t])}” (pos ${t}).`
      : `Light is use, once a prompt has run and “activity” is on.`,
    `Ripples: how much each block changes the token as it passes down the stack.`,
    act && $("anatAct").checked ? `Under each disc: neurons (n) and heads (h) carrying 90% of the block's work.` : "",
  ];
  lines.forEach((s, i) => s && ctx.fillText(s, tx, 26 + i * 17));
}

// ---------------------------------------------------------------- ripples
function launchRipples() {
  if (cylMode()) { launch3dRipples(); return; }
  if (!act || !layout) return;
  const now = performance.now(), R = act.ripple;
  const mags = R.map((r) => Math.sqrt(r[t][0] + r[t][1]));
  const mx = Math.max(...mags, 1e-9);
  ripples = layout.items.filter((it) => it.kind === "block").map((it) => ({ it, start: now + it.l * 22, s: mags[it.l] / mx }));
  if (!rafId) rafId = requestAnimationFrame(animate);
}
function animate(now) {
  const ov = $("anatripple"), dpr = devicePixelRatio || 1, ctx = ov.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, ov.width, ov.height);
  let alive = false;
  for (const rp of ripples) {
    const p = (now - rp.start) / 700;
    if (p < 0) { alive = true; continue; }
    if (p > 1) continue;
    alive = true;
    ctx.strokeStyle = `rgba(255,255,255,${(1 - p) * (0.25 + 0.75 * rp.s)})`;
    ctx.lineWidth = 0.8 + 4 * rp.s;
    ctx.beginPath(); ctx.arc(rp.it.x, rp.it.y, rp.it.r * p, 0, 2 * Math.PI); ctx.stroke();
  }
  rafId = alive ? requestAnimationFrame(animate) : 0;
}

// ---------------------------------------------------------------- controls
function setT(v) {
  if (!act) return;
  t = Math.max(0, Math.min(act.T - 1, v));
  $("anatT").value = t;
  $("anatTok").innerHTML = `${UI.esc(tok(act.tokens[t]))} <span class="muted">${t + 1}/${act.T}</span>`;
  draw(); launchRipples();
}
function stop() { playing = false; clearTimeout(timer); $("anatPlay").textContent = "▶"; }
function step() {
  if (!playing || !act) return;
  if (t >= act.T - 1) { stop(); return; }
  setT(t + 1);
  timer = setTimeout(step, 2200 / +$("anatSpeed").value);
}
$("anatPlay").addEventListener("click", () => {
  if (!act) return;
  if (playing) { stop(); return; }
  playing = true; $("anatPlay").textContent = "⏸";
  setT(t >= act.T - 1 ? 0 : t); timer = setTimeout(step, 2200 / +$("anatSpeed").value);
});
$("anatT").addEventListener("input", (e) => { stop(); setT(+e.target.value); });
$("anatAct").addEventListener("change", () => draw());

// hover: what is this disc / sector / slot
const tip = $("anattip"), neurCache = new Map();
async function neurons(l, ids) {
  const miss = ids.filter((i) => !neurCache.has(`${l}:${i}`));
  if (miss.length) {
    const d = await (await fetch(`/api/anatomy_neurons?l=${l}&ids=${miss.join(",")}`)).json();
    for (const [i, v] of Object.entries(d)) neurCache.set(`${l}:${i}`, v);
  }
  return ids.map((i) => [i, neurCache.get(`${l}:${i}`)]);
}
let hoverKey = null;
$("anatcanvas").addEventListener("mousemove", (e) => {
  if (!layout) return;
  const r = $("anatcanvas").getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const it = layout.items.find((q) => Math.hypot(x - q.x, y - q.y) <= q.r);
  if (!it) { tip.style.display = "none"; hoverKey = null; return; }
  describeAt(it, Math.hypot(x - it.x, y - it.y) / it.r, (Math.atan2(y - it.y, x - it.x) + Math.PI) / (2 * Math.PI), e);
});
// What is under the pointer: disc ``it``, at radius rr (0..1) and angle a01 (0..1, same convention
// as renderDisc).
async function describeAt(it, rr, a01, e) {
  const w = $("anatwrap").getBoundingClientRect();
  tip.style.left = Math.min(w.width - 340, e.clientX - w.left + 14) + "px"; tip.style.top = (e.clientY - w.top + 14) + "px";
  tip.style.display = "block";
  if (it.kind !== "block") {
    const D = stat[it.kind];
    tip.innerHTML = `<b>${D.name}</b> · ${(D.params / 1e9).toFixed(2)}B parameters<div class="muted">one row per vocabulary token (248k), sorted around the disc by where the token sits on the Space map; tone = the real ternary weights</div>`;
    return;
  }
  const B = stat.blocks[it.l], rc = Math.sqrt(B.coreP / (B.coreP + B.mlpP));
  const fmtM = (p) => `${(p / 1e6).toFixed(1)}M`;
  let html = `<b>L${it.l}</b> <span class="kindtag ${B.kind}">${B.kind === "gdn" ? "DeltaNet memory" : "softmax attention"}</span> · ${fmtM(B.params)} parameters` +
    `<div class="muted">core ${Object.entries(B.core).map(([k, v]) => `${k} ${fmtM(v)}`).join(" · ")}${B.small ? ` · write/decay/conv ${fmtM(B.small)}` : ""} · ring (MLP) gate ${fmtM(B.mlp.gate)} · up ${fmtM(B.mlp.up)} · down ${fmtM(B.mlp.down)}</div>`;
  const useAct = act && $("anatAct").checked;
  if (rr <= rc) {
    const head = Math.min(B.heads - 1, Math.floor(a01 * B.heads));
    html += `<div>head ${head}${B.kind === "attn" ? ` (shares key/value head ${Math.floor(head / 6)})` : ` (reads key head ${Math.floor(head / 3)})`}` +
      (useAct ? ` · for “${UI.esc(tok(act.tokens[t]))}” it reads ${(act.headA[(it.l * act.T + t) * 48 + head] / 2.55).toFixed(0)}% as much as this block's busiest head` : "") + `</div>`;
    if (useAct) html += `<div class="muted">${act.h90[it.l][t]} of ${B.heads} heads carry 90% of what this block reads here</div>`;
    tip.innerHTML = html;
    return;
  }
  const k = Math.min(stat.slots - 1, Math.floor(a01 * stat.slots));
  html += `<div>MLP ring, slot ${k} of ${stat.slots} (~${Math.round(stat.neurons / stat.slots)} neurons with similar meaning)</div>`;
  if (useAct) {
    html += `<div class="muted">${act.n90[it.l][t]} of ${stat.neurons.toLocaleString()} neurons carry 90% of this block's MLP work for “${UI.esc(tok(act.tokens[t]))}”; its most active:</div>`;
    const key = `${it.l}:${t}`;
    tip.innerHTML = html + `<div class="muted">…</div>`;
    hoverKey = key;
    const list = await neurons(it.l, act.top_neurons[it.l][t]);
    if (hoverKey !== key) return;
    const signs = act.top_sign[it.l][t];
    tip.innerHTML = html + list.map(([i, v], j) => {
      // a negative activation writes the neuron's direction backwards: swap toward / away
      const [to, away] = signs[j] < 0 ? [v.down, v.up] : [v.up, v.down];
      return `<div class="anrow">neuron ${i}${signs[j] < 0 ? " (negative)" : ""}: pushes toward <b>${to.map((w) => UI.esc(tok(w))).join(" ")}</b> · away from ${away.map((w) => UI.esc(tok(w))).join(" ")}</div>`;
    }).join("");
  } else tip.innerHTML = html;
}
$("anatcanvas").addEventListener("mouseleave", () => { tip.style.display = "none"; hoverKey = null; });
$("anatcanvas").addEventListener("click", (e) => {  // open this block at the current position in the grid
  if (!layout || !UI.data) return;
  const r = $("anatcanvas").getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const it = layout.items.find((q) => q.kind === "block" && Math.hypot(x - q.x, y - q.y) <= q.r);
  if (it) { const li = UI.data.layers.indexOf(it.l); if (li >= 0) UI.selectCell(li, t); }
});

async function refresh() {
  if (!active) return;
  if (!(await loadStatic())) return;
  draw();
  const a = await loadAct();
  if (a) {
    $("anatT").max = a.T - 1;
    const want = UI.sel ? UI.sel[1] : a.T - 1;
    discCache.clear();
    setT(Math.min(want, a.T - 1));
  }
}
let lastW = 0;
new ResizeObserver(() => { const w = $("anatscroll").clientWidth; if (active && stat && w !== lastW) { lastW = w; draw(); } }).observe($("anatscroll"));
window.addEventListener("lens:view", (e) => { active = e.detail === "anatomy"; if (!active) { stop(); loop3d(false); } else refresh(); });
$("anatShape").addEventListener("change", () => { draw(); loop3d(cylMode()); if (cylMode() && three) frame3d(); if (act) launchRipples(); });
window.addEventListener("lens:data", () => { act = null; discCache.clear(); stop(); if (active) refresh(); });
window.lensAnatomy = { get stat() { return stat; }, get act() { return act; }, get layout() { return layout; }, setT };

// ---------------------------------------------------------------- the cylinder (3D)
// The same discs stacked along one axis, in order: embedding, L0 … L63, output head. The axis is
// horizontal (the stack reads left to right like the other views); a token's pass through the
// model is a pulse travelling along it, and each block rings as the pulse crosses it.
const TEX_R = 110, GAP = 1.5, R3 = 10;
let three = null;
function init3d() {
  if (three) return three;
  const host = $("anat3d");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(devicePixelRatio);
  host.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  host.appendChild(labels.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const group = new THREE.Group(); scene.add(group);
  three = { host, renderer, labels, scene, camera, controls, group, discs: [], rings: [], pulse: null, ripples: [], looping: false };
  new ResizeObserver(() => size3d()).observe(host);
  return three;
}
function size3d() {
  if (!three) return;
  const { clientWidth: w, clientHeight: h } = three.host;
  if (!w || !h) return;
  three.renderer.setSize(w, h); three.labels.setSize(w, h);
  three.camera.aspect = w / h; three.camera.updateProjectionMatrix();
}
function build3d() {
  const T3 = init3d(), g = T3.group;
  g.children.slice().forEach((o) => { o.element?.remove(); g.remove(o); o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
  T3.discs = []; T3.rings = [];
  const r0 = stat.blocks[0].params;
  const items = [{ kind: "embed", x: 0, r: R3 * Math.sqrt(stat.embed.params / r0) }];
  for (let l = 0; l < stat.L; l++) items.push({ kind: "block", l, x: (l + 1) * GAP, r: R3 * Math.sqrt(stat.blocks[l].params / r0) });
  items.push({ kind: "head", x: (stat.L + 1) * GAP, r: R3 * Math.sqrt(stat.head.params / r0) });
  for (const it of items) {
    // the end caps are bigger and would hide the stack: keep them more see-through
    const mat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: it.kind === "block" ? 0.9 : 0.45 });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(it.r, 96), mat);
    mesh.rotation.y = Math.PI / 2;  // face along the axis
    mesh.position.set(it.x, 0, 0);
    mesh.userData.it = it;
    g.add(mesh); T3.discs.push(mesh);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.y = Math.PI / 2; ring.position.set(it.x + 0.01, 0, 0); ring.visible = false;
    g.add(ring); T3.rings.push(ring);
    if (it.kind !== "block" || stat.blocks[it.l].kind === "attn" || it.l === 0) {
      const d = document.createElement("div");
      d.className = "vlab"; d.textContent = it.kind === "block" ? `L${it.l}${stat.blocks[it.l].kind === "attn" ? " attn" : ""}` : stat[it.kind].name;
      const o = new CSS2DObject(d); o.position.set(it.x, -it.r - 1.5, 0); g.add(o);
    }
  }
  // the axis (the stalk), and a faint shell so it reads as one cylinder
  const L = (stat.L + 1) * GAP;
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3, 0, 0), new THREE.Vector3(L + 3, 0, 0)]),
    new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.6 })));
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R3 * 1.02, R3 * 1.02, stat.L * GAP, 64, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true, transparent: true, opacity: 0.05 }));
  shell.rotation.z = Math.PI / 2; shell.position.x = (stat.L + 1) * GAP / 2; g.add(shell);
  T3.pulse = new THREE.Mesh(new THREE.RingGeometry(R3 * 1.05, R3 * 1.25, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  T3.pulse.rotation.y = Math.PI / 2; g.add(T3.pulse);
  T3.built = stat;
  requestAnimationFrame(frame3d);  // after the container has its size
}
function frame3d() {  // fit the whole stack (plus the end discs) in view, seen from the front and a little above
  size3d();
  const L = (stat.L + 1) * GAP, c = new THREE.Vector3(L / 2, 0, 0), cam = three.camera;
  const span = L + 2 * R3 * Math.sqrt(stat.embed.params / stat.blocks[0].params);
  const hfov = 2 * Math.atan(Math.tan((cam.fov * Math.PI) / 360) * cam.aspect);
  const d = (span * 0.5) / Math.tan(hfov / 2);
  three.controls.target.copy(c);
  // three-quarter view from the input end: the disc faces are visible, the axis recedes to the output
  cam.position.set(L / 2 - d * 0.62, d * 0.3, d * 0.74);
  three.controls.update();
}
function draw3d() {
  if (!three || three.built !== stat) build3d();
  size3d();
  // repaint every disc's texture for the current token (activity) or the static anatomy
  const key = `${$("anatAct").checked && act ? t : "static"}:3d`;
  for (const mesh of three.discs) {
    const it = mesh.userData.it, k = `${it.kind}${it.l ?? ""}:${key}`;
    let img = discCache.get(k);
    if (!img) { img = renderDisc({ ...it, r: TEX_R }, 1); discCache.set(k, img); }
    if (mesh.material.map?.image !== img) {
      mesh.material.map?.dispose();
      mesh.material.map = new THREE.CanvasTexture(img);
      mesh.material.map.colorSpace = THREE.SRGBColorSpace;
      mesh.material.needsUpdate = true;
    }
  }
  loop3d(true);
}
function launch3dRipples() {
  if (!act || !three) return;
  const now = performance.now();
  const mags = act.ripple.map((r) => Math.sqrt(r[t][0] + r[t][1]));
  const mx = Math.max(...mags, 1e-9);
  three.ripples = three.discs.map((mesh, i) => {
    const it = mesh.userData.it;
    return it.kind === "block" ? { i, start: now + (it.l + 1) * 22, s: mags[it.l] / mx } : null;
  }).filter(Boolean);
  three.pulseStart = now;
}
function loop3d(on) {
  if (!three) return;
  if (on && !three.looping) {
    three.looping = true;
    three.renderer.setAnimationLoop((now) => {
      three.controls.update();
      // ripples: each block rings as the pulse crosses it
      for (const ring of three.rings) ring.visible = false;
      for (const rp of three.ripples) {
        const p = (now - rp.start) / 700;
        if (p < 0 || p > 1) continue;
        const ring = three.rings[rp.i], r = three.discs[rp.i].userData.it.r;
        ring.visible = true; ring.scale.setScalar(Math.max(0.01, r * p));
        ring.material.opacity = (1 - p) * (0.25 + 0.75 * rp.s);
      }
      const pp = three.pulseStart ? (now - three.pulseStart) / (stat.L * 22 + 300) : 2;
      three.pulse.material.opacity = pp >= 0 && pp <= 1 ? 0.35 * Math.sin(Math.PI * pp) : 0;
      three.pulse.position.x = Math.min(1, Math.max(0, pp)) * (stat.L + 1) * GAP;
      three.renderer.render(three.scene, three.camera); three.labels.render(three.scene, three.camera);
    });
  } else if (!on && three.looping) {
    three.looping = false; three.renderer.setAnimationLoop(null);
  }
}
// hover / click in 3D: which disc, where on it
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
function pick3d(e) {
  if (!three) return null;
  const r = three.renderer.domElement.getBoundingClientRect();
  mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, three.camera);
  const hit = ray.intersectObjects(three.discs, false)[0];
  if (!hit) return null;
  const it = hit.object.userData.it, p = hit.object.worldToLocal(hit.point.clone());
  // the texture's canvas y runs down while the disc's local y runs up
  return { it, rr: Math.hypot(p.x, p.y) / it.r, a01: (Math.atan2(-p.y, p.x) + Math.PI) / (2 * Math.PI) };
}
$("anat3d").addEventListener("mousemove", (e) => {
  const h = pick3d(e);
  if (!h) { tip.style.display = "none"; hoverKey = null; return; }
  describeAt(h.it, h.rr, h.a01, e);
});
$("anat3d").addEventListener("mouseleave", () => { tip.style.display = "none"; hoverKey = null; });
$("anat3d").addEventListener("dblclick", (e) => {  // double-click: open this block in the grid (single clicks orbit)
  const h = pick3d(e);
  if (h && h.it.kind === "block" && UI.data) { const li = UI.data.layers.indexOf(h.it.l); if (li >= 0) UI.selectCell(li, t); }
});
window.lensAnatomy.three = () => three;
