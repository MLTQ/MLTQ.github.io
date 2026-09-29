// Static-site shim for the Lens viewer (see scripts/export_static.py).
//
// The viewer talks to a local model server through /api/... requests. On a static host there is no
// server: this script, loaded before everything else, answers those requests from pre-rendered
// files in ./data/<sentence>/ and ./data/shared/, maps /space/ and /joint/ to the shared maps, and
// turns what needs a live model (typing a new prompt, generating, knockouts, pinning, other heads or
// candidates than the pre-rendered ones) into a short explanation instead of an error.
(function () {
  "use strict";
  window.LENS_STATIC = true;
  const DATA = new URL("data/", document.baseURI);
  const LIVE = "This needs the live model. The site shows pre-rendered sentences; run the viewer locally for everything (github.com/MLTQ/Lens).";
  const realFetch = window.fetch.bind(window);
  const cache = new Map();
  const file = (p) => {
    if (!cache.has(p)) cache.set(p, realFetch(new URL(p, DATA)).then((r) => {
      if (!r.ok) throw new Error(`${p}: ${r.status}`);
      return p.endsWith(".bin") ? r.arrayBuffer() : r.json();
    }));
    return cache.get(p);
  };
  let sentences = [], slug = null;
  const params = new URLSearchParams(location.search);
  const ready = file("sentences.json").then((s) => {
    sentences = s;
    slug = s.some((x) => x.slug === params.get("s")) ? params.get("s") : s[0].slug;
  });
  const cur = (name) => file(`${slug}/${name}`);
  const json = (obj) => new Response(JSON.stringify(obj), { headers: { "content-type": "application/json" } });
  const live = (why) => json({ error: why ? `${why} ${LIVE}` : LIVE });

  // KV disks: every head of every cell, arrays stored as packed float32
  async function kvHeads(l, t) {
    const [idx, buf] = await Promise.all([cur("kv_heads.json"), cur("kv_heads.bin")]);
    const e = idx[`${l},${t}`];
    if (!e) return { error: "not pre-rendered" };
    const f = new Float32Array(buf), keys = ["x", "y", "z", "w", "logit"];
    const heads = e.heads.map((h) => {
      const o = { h: h.h, share: h.share, q_norm: h.q_norm };
      keys.forEach((k, j) => { o[k] = Array.from(f.subarray(h.off + j * h.n, h.off + (j + 1) * h.n)); });
      return o;
    });
    return { ...e, heads };
  }

  async function answer(path, q, body) {
    await ready;
    const n = (k) => +q.get(k);
    switch (path) {
      case "info": return file("shared/info.json");
      case "run": {
        if (body.generate) return { error: `Generating new tokens ${LIVE.replace("This needs", "needs")}` };
        const want = (body.prompt || "").trim(), hit = sentences.find((x) => x.prompt.trim() === want);
        if (!hit) return { error: `Only the pre-rendered sentences can be run here. ${LIVE}` };
        slug = hit.slug;
        return cur(`run_${body.lens === "logit" ? "logit" : "jacobian"}.json`);
      }
      case "attention": return cur("attention.json");
      case "attn_cell": return (await cur("attn_cell.json"))[`${n("l")},${n("t")}`] ?? { error: "not pre-rendered" };
      case "nonverbal": return cur("nonverbal.json");
      case "river": return cur("river.json");
      case "anatomy": return file("shared/anatomy.json");
      case "anatomy_act": return cur("anatomy_act.json");
      case "anatomy_neurons": {
        const all = await cur("anatomy_neurons.json"), out = {};
        for (const i of (q.get("ids") || "").split(",").filter(Boolean)) {
          const v = all[`${n("l")}:${i}`];
          if (v) out[i] = v;
        }
        return out;
      }
      case "kv": {
        const r = (await cur("kv.json"))[`${n("l")},${n("t")}`];
        if (!r) return { error: "not pre-rendered" };
        if (n("h") >= 0 && n("h") !== r.h) return { error: `Only each cell's strongest head (head ${r.h}) is pre-rendered for this view; the “all heads” disks show every head. ${LIVE}` };
        return r;
      }
      case "kv_heads": return kvHeads(n("l"), n("t"));
      case "kv_track": return (await cur("kv_track.json"))[`${n("l")},${n("h")}`] ?? { error: `Playback is pre-rendered for each layer's strongest heads only. ${LIVE}` };
      case "race": return (await cur("race.json"))[`${n("t")}|${q.get("cands")}`] ?? { error: `The race is pre-rendered for each position's top three predictions. ${LIVE}` };
      case "use": {
        if (q.get("probe") || +q.get("check")) return { error: `Extra knockout checks ${LIVE.replace("This needs", "need")}` };
        const r = (await cur("use.json"))[`${n("t")}|${n("u")}`];
        const a = sentences.find((x) => x.slug === slug)?.answer;
        return r ?? { error: `“Explain” is pre-rendered for the answer: position ${a?.t}, the model's top prediction there. ${LIVE}` };
      }
      case "translate": {
        const all = await cur("translate.json"), out = {};
        for (const i of body.ids || []) if (all[i]) out[i] = all[i];
        return out;
      }
      case "space_nn": {
        const all = await file("shared/neighbors.json"), r = all[n("id")];
        return r ? { id: n("id"), neighbors: r.map(([id, sim]) => ({ id, sim })) }
          : { error: "Neighbours are pre-rendered for the tokens of these sentences and their readouts. " + LIVE };
      }
      default: return { error: LIVE };
    }
  }

  window.fetch = async function (input, init) {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    const m = url.pathname.match(/\/api\/([\w]+)$/);
    if (m && url.origin === location.origin) {
      let body = {};
      try { body = init?.body ? JSON.parse(init.body) : {}; } catch { /* not JSON */ }
      try { return json(await answer(m[1], url.searchParams, body)); }
      catch (e) { return json({ error: `Could not load pre-rendered data (${e.message}).` }); }
    }
    const sm = url.pathname.match(/\/(space|joint)\/(.+)$/);
    if (sm && url.origin === location.origin && !url.pathname.includes("/data/")) return realFetch(new URL(`shared/${sm[1]}/${sm[2]}`, DATA));
    return realFetch(input, init);
  };

  // ---------------------------------------------------------------- page chrome
  const css = `
    .gencontrols, #useCheck, .pin.ko, #kobox, #append { display: none !important; }
    #prompt { display: none; }
    .lens-static { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
    .lens-static select { font: inherit; font-size: 14px; padding: 6px 8px; max-width: 100%; }
    .lens-static .note { font-size: 12px; color: var(--muted); }
    .lens-static .note a { color: inherit; }`;
  document.addEventListener("DOMContentLoaded", async () => {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    await ready;
    const prompt = document.getElementById("prompt");
    const box = document.createElement("div");
    box.className = "lens-static";
    const sel = document.createElement("select");
    sel.setAttribute("aria-label", "Pre-rendered sentence");
    sel.innerHTML = sentences.map((s) => `<option value="${s.slug}">${s.title} — ${s.prompt.replace(/\n/g, "↵")}</option>`).join("");
    sel.value = slug;
    const note = document.createElement("div");
    note.className = "note";
    const setNote = () => {
      const s = sentences.find((x) => x.slug === sel.value);
      note.innerHTML = `${s.note} <span>· Pre-rendered snapshot of Ternary-Bonsai-2-27B: browse every view; things that need the live model are off. <a href="https://github.com/MLTQ/Lens">Run it yourself</a>.</span>`;
    };
    setNote();
    box.append(sel, note);
    prompt.parentNode.insertBefore(box, prompt);
    const go = () => {
      const s = sentences.find((x) => x.slug === sel.value);
      prompt.value = s.prompt;
      // open on the position that predicts the answer (its "explain" is pre-rendered)
      window.addEventListener("lens:data", () => setTimeout(() => {
        const UI = window.lensUI, d = UI?.data;
        if (d && s.answer) UI.selectCell(d.layers.length - 1, s.answer.t, { scroll: true });
      }, 0), { once: true });
      const u = new URL(location.href); u.searchParams.set("s", s.slug); history.replaceState(null, "", u);
      setNote();
      document.getElementById("run").click();
    };
    sel.addEventListener("change", go);
    // pinning needs the model (ranks of arbitrary tokens): hide that section
    const pinRow = document.getElementById("pinBtn")?.parentElement;
    if (pinRow) {
      for (const el of [pinRow.previousElementSibling, pinRow, pinRow.nextElementSibling, pinRow.nextElementSibling?.nextElementSibling])
        if (el && el.id !== "legend") el.style.display = "none";
    }
    go();
  });
})();
