/* MLTQ Archive — every system, in one place.
   The index rows, the DAG nav, the commit fields and the per-project
   pages are all generated from this array. Order within a genus is the
   order shown on the index.

   ---------------------------------------------------------------------
   FIELDS
   ---------------------------------------------------------------------
   slug      required. url is projects/<slug>.html
   name      required. displayed in Michroma
   genus     required. one of the ids in content/site.js
   status    ACTIVE | SHIPPED | CYCLING | DORMANT | SEED
   featured  true  -> full row on the index (glyph, description, log, field)
             false -> compact one-line row. Both still get a full page.
   summary   one paragraph. index row + page hero + <meta description>
   log       [{ date?, text }] — dated entries render '2026.08.02 — text',
             undated render '— text'
   repo      'MLTQ/name' or null. null hides the source line.
   mesh      true -> status reads 'ACTIVE · ON THE MESH'
   cross     ['retia'] — cross-filed genera. Draws a periwinkle DAG edge
             and adds the project to that genus's bridge list.
   heat      { seed, ramp } — stylized commit field.
             ramp: 'up' (ramping) | 'down' (fading) | 'flat' | 'seed' (sparse)
             For REAL data use { counts: [0,3,1,...] } — one integer per
             day, oldest first, e.g. from the GitHub events or stats API.
   glyph     [{ x, y, w, h, r?, rot?, ring? }] on a 56x56 grid.
             r: number (units) or a CSS string, '50%' for a circle.
             ring: border width in units -> hollow shape.
             rot: degrees.
   tags      filed-under tags in the page footer.

   ---------------------------------------------------------------------
   WHAT IS *NOT* HERE
   ---------------------------------------------------------------------
   The prose on a project's own page — commentary, dated entries, stats,
   media, extra links — lives in content/projects/<slug>.md, so it can be
   written in Markdown instead of JS string literals. See the README, or
   content/projects/jewels.md for a worked example.

   This file stays the ledger: the things the index rows and the DAG need.
   A project with no page file still gets a page; its `log` renders as
   FIELD NOTES. Run `node build.js --scaffold` to create the missing ones.
*/

export default [

/* ============ BIOTA — things that live ============ */
{
  slug: 'bonsai', name: 'BONSAI', genus: 'biota', status: 'ACTIVE', featured: true,
  repo: 'MLTQ/neural-cellular-automatar',
  summary: 'Neural Cellular Automatar: a continuously moving cellular avatar on your desk, steered through two separate latent spaces — a 10-D preference space for what it wants, a pose/occupancy space for what its 256³ body can be.',
  log: [
    { text: 'limbs travel instead of crossfading; births only beside the live frontier' },
    { text: '9× render speedup: raymarch the motion envelope, not the cube' },
    { text: 'moods: idle, walk, sleep, dread, manic, curious, content, agitated' },
  ],
  heat: { seed: 13, ramp: 'flat' },
  glyph: [
    { x: 7,  y: 23, w: 23, h: 23, r: '50%' },
    { x: 25, y: 9,  w: 28, h: 28, r: '50%' },
    { x: 30, y: 34, w: 20, h: 20, r: '50%' },
  ],
  tags: ['Cellular automata', 'Latent spaces', 'Raymarching'],
},
{
  slug: 'petridish', name: 'PETRIDISH', short: 'PETRI', genus: 'biota', status: 'ACTIVE', featured: true,
  repo: 'MLTQ/petridish',
  summary: 'A live laboratory for neural populations embedded in physical space. Neurons occupy sites, retain metabolic state, grow persistent dendrites, and undergo birth, death, and lesions — while learning MNIST, associative recall, and Tiny Shakespeare.',
  log: [
    { text: '~1,900 neurons and 7,000 local dendrites persist across digits' },
    { text: 'lesion brush: remove neurons and every incident dendrite' },
    { text: 'displayed traffic and credit are measurements, not animation' },
  ],
  heat: { seed: 103, ramp: 'up' },
  glyph: [
    { x: 6,  y: 6,  w: 44, h: 44, r: '50%', ring: 4 },
    { x: 18, y: 16, w: 8,  h: 8,  r: '50%' },
    { x: 31, y: 24, w: 8,  h: 8,  r: '50%' },
    { x: 21, y: 33, w: 8,  h: 8,  r: '50%' },
  ],
  tags: ['Spatial networks', 'Plasticity', 'Lesion studies'],
},
{
  slug: 'flesh-and-bone', name: 'FLESH + BONE', short: 'F+B', genus: 'biota', status: 'ACTIVE', featured: true,
  repo: 'MLTQ/flesh-and-bone',
  summary: 'A particle neural cellular automaton for skeletally coherent, self-assembling creatures: bone as scaffold, morphogen body plan, flesh as persistent mobile Gaussian splats. Cells migrate to under-filled tissue, differentiate, and heal wounds.',
  log: [
    { text: 'H0→H8 research ladder complete, failures retained as failures' },
    { text: '91,979-cell body; a ~48 KiB learned rule moves all of it' },
    { text: 'wound repair: 29 cells deleted, 29 fed, coverage returns to 0.97' },
  ],
  heat: { seed: 113, ramp: 'up' },
  glyph: [
    { x: 4,  y: 20, w: 18, h: 18, r: '50%' },
    { x: 18, y: 25, w: 22, h: 8,  r: 4 },
    { x: 36, y: 20, w: 18, h: 18, r: '50%' },
  ],
  tags: ['Morphogenesis', 'Gaussian splats', 'Self-repair'],
},
{
  slug: 'ponderer', name: 'PONDERER', genus: 'biota', status: 'ACTIVE', featured: true,
  repo: 'MLTQ/ponderer',
  summary: 'Not a coding agent. A buddy. Universal Basic Digimon: it chats with you, takes actions, has personal desires and thoughts, and acts on its own behalf. Capabilities arrive as versioned plugins it can draft for itself.',
  log: [
    { text: 'plugin workbench: the model scaffolds, validates, and stages its own plugins' },
    { text: 'staging never executes code; enabling authority stays with the operator' },
    { text: 'Telegram bridge, so the buddy fits in your pocket' },
  ],
  heat: { seed: 131, ramp: 'flat' },
  glyph: [
    { x: 8,  y: 12, w: 32, h: 32, r: '50%' },
    { x: 34, y: 30, w: 16, h: 16, r: '50%' },
  ],
  tags: ['Agents', 'Plugins', 'Autonomy'],
},
{
  slug: 'hunger', name: 'HUNGER', genus: 'biota', status: 'CYCLING', featured: false,
  repo: null, cross: ['retia'],
  summary: 'A novelty-driven crawler: each page is digested, scored for nutrition, and allowed to reproduce into more links when it looks rich.',
  log: [{ text: 'nutrition score gates reproduction; starved branches are pruned' }],
  heat: { seed: 149, ramp: 'flat' },
  glyph: [
    { x: 6,  y: 14, w: 28, h: 28, r: '50%' },
    { x: 30, y: 20, w: 17, h: 17, r: '50%' },
    { x: 44, y: 28, w: 9,  h: 9,  r: '50%' },
  ],
  tags: ['Crawlers', 'Novelty search'],
},
{
  slug: 'lenia-3d', name: 'LENIA-3D', short: 'LENIA', genus: 'biota', status: 'CYCLING', featured: false,
  repo: null,
  summary: 'A 3D-first Lenia workspace: official 3D species loaded and raymarched in wgpu; reference and FFT stepping paths.',
  log: [{ text: 'reference and FFT steppers agree; wgpu raymarch for the view' }],
  heat: { seed: 151, ramp: 'flat' },
  glyph: [
    { x: 6,  y: 6,  w: 44, h: 44, r: '50%', ring: 3 },
    { x: 15, y: 15, w: 26, h: 26, r: '50%', ring: 3 },
    { x: 24, y: 24, w: 8,  h: 8,  r: '50%' },
  ],
  tags: ['Lenia', 'wgpu', 'Continuous CA'],
},

/* ============ OPTICA — things that watch ============ */
{
  slug: '1kee', name: '1KEE', genus: 'optica', status: 'ACTIVE', featured: true,
  repo: 'MLTQ/1kee', mesh: true, cross: ['retia'],
  summary: 'One Thousand Electric Eye. A GPU-rendered globe as an OSINT surface: live events, vessels, flights, and public webcams projected onto geography. Event → nearby cameras → attempted feed connection.',
  log: [
    { text: 'per-pixel ray–sphere globe shader; Earth, Moon, and Mars' },
    { text: 'AIS vessels, ADS-B flights, Factal events, camera registries' },
    { text: "mirrors the analyst's live view onto the local Gruve mesh" },
  ],
  heat: { seed: 53, ramp: 'up' },
  glyph: [
    { x: 6,  y: 10, w: 44, h: 9, r: 5, rot: -4 },
    { x: 10, y: 24, w: 35, h: 9, r: 5, rot: 3 },
    { x: 17, y: 38, w: 24, h: 9, r: 5, rot: -2 },
  ],
  tags: ['OSINT', 'Shaders', 'Geospatial'],
},
{
  slug: 'doten', name: 'DOTEN', genus: 'optica', status: 'ACTIVE', featured: true,
  repo: 'MLTQ/doten', mesh: true, cross: ['retia'],
  summary: 'Dota 2 replays as space-time visualizations: the minimap is the ground plane, time rises along the vertical axis, and everything that happened in the game lives somewhere in that column.',
  log: [
    { text: 'native Rust .dem parsing, under a second per game' },
    { text: 'scan-plane playback, activity clouds, library aggregates' },
    { text: 'friends browse the replay library over Gruve; scrubbing syncs' },
  ],
  heat: { seed: 97, ramp: 'flat' },
  glyph: [
    { x: 12, y: 6,  w: 14, h: 44, r: 7 },
    { x: 34, y: 10, w: 9,  h: 9,  r: '50%' },
    { x: 38, y: 26, w: 9,  h: 9,  r: '50%' },
    { x: 32, y: 41, w: 9,  h: 9,  r: '50%' },
  ],
  tags: ['Space-time', 'Rust', 'Replays'],
},
{
  slug: 'fileogenetic-tree', name: 'FILEOGENETIC TREE', short: 'FILEO', genus: 'optica', status: 'CYCLING', featured: false,
  repo: null,
  summary: 'A filesystem as a radial dendrogram or size-proportional treemap; live streamed indexing, an animated emerging tree.',
  log: [{ text: 'streamed indexing — the tree grows while the walk is still running' }],
  heat: { seed: 157, ramp: 'flat' },
  glyph: [
    { x: 24, y: 24, w: 8,  h: 8, r: '50%' },
    { x: 28, y: 26, w: 21, h: 3, r: 2, rot: -40 },
    { x: 28, y: 26, w: 23, h: 3, r: 2 },
    { x: 28, y: 26, w: 21, h: 3, r: 2, rot: 40 },
    { x: 45, y: 9,  w: 8,  h: 8, r: '50%' },
    { x: 47, y: 24, w: 8,  h: 8, r: '50%' },
    { x: 45, y: 39, w: 8,  h: 8, r: '50%' },
  ],
  tags: ['Filesystems', 'Dendrograms', 'Treemaps'],
},
{
  slug: 'vizier', name: 'VIZIER', genus: 'optica', status: 'SHIPPED', featured: false,
  repo: null,
  summary: '`vz`: structured desktop-perception snapshots — an eye that gives agents a sense of the system they live in.',
  log: [{ text: 'structured snapshots, not screenshots: agents read state, not pixels' }],
  heat: { seed: 163, ramp: 'down' },
  glyph: [
    { x: 3,  y: 18, w: 50, h: 21, r: '50%', ring: 4 },
    { x: 22, y: 22, w: 13, h: 13, r: '50%' },
  ],
  tags: ['Agents', 'Desktop perception', 'CLI'],
},
{
  slug: 'big-arrows', name: 'BIG ARROWS', short: 'ARROWS', genus: 'optica', status: 'SEED', featured: false,
  repo: null,
  summary: 'Arrows. Big ones. It will explain itself when it is ready.',
  log: [{ text: 'not yet' }],
  heat: { seed: 167, ramp: 'seed' },
  glyph: [
    { x: 4,  y: 25, w: 30, h: 7,  r: 3 },
    { x: 30, y: 18, w: 21, h: 21, r: 3, rot: 45 },
  ],
  tags: [],
},

/* ============ PHONICA — things that speak and sound ============ */
{
  slug: 'gong', name: 'PHYSICAL GONG SIM', short: 'GONG', genus: 'phonica', status: 'CYCLING', featured: false,
  repo: null,
  summary: 'An interactive gong built with modal synthesis: a circular plate, a movable contact point, and controls for excitation, plate shape, and resonance.',
  log: [
    { text: 'circular plate visualization alongside a mode coupling spectrum' },
    { text: 'controls for pitch, excitation, plate geometry, and reverb' },
  ],
  glyph: [],
  tags: ['Modal synthesis', 'Sound', 'Interactive instruments'],
},
{
  slug: 'pharaoh', name: 'PHARAOH', genus: 'phonica', status: 'ACTIVE', featured: true,
  repo: 'MLTQ/pharaoh', mesh: true,
  summary: 'An AI-powered audio drama production suite built around the Pyramid workflow: story bible → storyboard → script → assets → composition → render. Operable by humans in the GUI and by agents through the headless CLI.',
  log: [
    { text: 'local TTS, foley, and score servers; a Fountain scene editor' },
    { text: 'binaural spatialization: place any clip in 3D, fly it on waypoints' },
    { text: 'a 13-room spatial catalog, vocal booth to cathedral to cave' },
  ],
  heat: { seed: 61, ramp: 'up' },
  glyph: [
    { x: 6,  y: 22, w: 8, h: 22, r: 4 },
    { x: 18, y: 10, w: 8, h: 40, r: 4 },
    { x: 30, y: 16, w: 8, h: 30, r: 4 },
    { x: 42, y: 26, w: 8, h: 14, r: 4 },
  ],
  tags: ['Audio drama', 'TTS', 'Spatial audio', 'Agent tooling'],
},
{
  slug: 'fosskiff', name: 'FOSSKIFF', genus: 'phonica', status: 'SHIPPED', featured: false,
  repo: null, cross: ['campi'],
  summary: 'An open-source 184HP Eurorack skiff in laser-cut sheet metal — rail-less, internal power, ~$150 built.',
  log: [{ text: 'rail-less sheet-metal body; internal power; ~$150 all-in' }],
  heat: { seed: 173, ramp: 'down' },
  glyph: [
    { x: 6,  y: 10, w: 44, h: 6,  r: 3 },
    { x: 6,  y: 40, w: 44, h: 6,  r: 3 },
    { x: 14, y: 18, w: 7,  h: 20, r: 2 },
    { x: 25, y: 18, w: 7,  h: 20, r: 2 },
    { x: 36, y: 18, w: 7,  h: 20, r: 2 },
  ],
  tags: ['Eurorack', 'Open hardware', 'Fabrication'],
},
{
  slug: 'rubberbard', name: 'RUBBERBARD', short: 'RBARD', genus: 'phonica', status: 'DORMANT', featured: false,
  repo: null,
  summary: 'An LSTM bard: MIDI in, songs out.',
  log: [{ text: 'dormant — kept for the archive' }],
  heat: { seed: 179, ramp: 'down' },
  glyph: [
    { x: 4,  y: 26, w: 48, h: 4,  r: 2 },
    { x: 12, y: 14, w: 10, h: 10, r: '50%' },
    { x: 26, y: 32, w: 10, h: 10, r: '50%' },
    { x: 40, y: 18, w: 10, h: 10, r: '50%' },
  ],
  tags: ['MIDI', 'LSTM'],
},
{
  slug: 'modular', name: 'MODULAR', genus: 'phonica', status: 'CYCLING', featured: false,
  repo: null,
  summary: 'Patch notes from the rack. Voltage is a medium; the cables are the score.',
  log: [{ text: 'patches logged as they happen' }],
  heat: { seed: 181, ramp: 'flat' },
  glyph: [
    { x: 8,  y: 10, w: 14, h: 14, r: '50%', ring: 3 },
    { x: 34, y: 34, w: 14, h: 14, r: '50%', ring: 3 },
    { x: 17, y: 26, w: 24, h: 4,  r: 2, rot: 41 },
  ],
  tags: ['Eurorack', 'Patches'],
},

/* ============ RETIA — things that connect ============ */
{
  slug: 'starchan', name: 'STARCHAN', genus: 'retia', status: 'ACTIVE', featured: true,
  repo: 'MLTQ/starchan',
  summary: 'A Tauri frontend for Graphchan — a decentralized, encrypted, p2p imageboard. Threads are DAGs: you can fork a conversation or reply to anything earlier, and there is no derailing. Posting is sharing.',
  log: [
    { text: 'GPG-signed posts; gossip propagation; local-first storage' },
    { text: 'DHT topic discovery rides the BitTorrent hash table' },
    { text: 'the graph view is the thread view; agents post as first-class peers' },
  ],
  heat: { seed: 127, ramp: 'flat' },
  glyph: [
    { x: 6,  y: 8,  w: 13, h: 13, r: '50%' },
    { x: 38, y: 16, w: 13, h: 13, r: '50%' },
    { x: 20, y: 38, w: 13, h: 13, r: '50%' },
    { x: 14, y: 16, w: 28, h: 4,  r: 2, rot: 14 },
    { x: 16, y: 30, w: 26, h: 4,  r: 2, rot: -58 },
  ],
  tags: ['p2p', 'Tauri', 'DAG threads', 'Encryption'],
},
{
  slug: 'orbweaver', name: 'ORBWEAVER', short: 'ORBWEAV', genus: 'retia', status: 'CYCLING', featured: false,
  repo: null,
  summary: "The original, native Rust Graphchan — backend, egui frontend, MCP server. Starchan's parent.",
  log: [{ text: 'backend, egui frontend, and MCP server in one tree' }],
  heat: { seed: 191, ramp: 'flat' },
  glyph: [
    { x: 2,  y: 2,  w: 52, h: 52, r: '50%', ring: 3 },
    { x: 13, y: 13, w: 30, h: 30, r: '50%', ring: 3 },
    { x: 26, y: 4,  w: 4,  h: 48, r: 2 },
    { x: 4,  y: 26, w: 48, h: 4,  r: 2 },
  ],
  tags: ['Rust', 'p2p', 'MCP'],
},
{
  slug: 'gruve-kit', name: 'GRUVE-KIT', short: 'GRUVE', genus: 'retia', status: 'ACTIVE', featured: false,
  repo: 'MLTQ/gruve-kit',
  summary: 'A peer-hosted lobby for a friend group. One app on each laptop, and everyone\'s running projects appear on everyone\'s board over direct encrypted connections: no server, no deploy, no accounts. The kit is the SDKs that make any app mesh-ready, reached by name, never by address.',
  log: [{ text: 'name-addressed apps; a lobby tile per announcement' }],
  heat: { seed: 193, ramp: 'up' },
  glyph: [
    { x: 5,  y: 5,  w: 12, h: 12, r: '50%' },
    { x: 39, y: 5,  w: 12, h: 12, r: '50%' },
    { x: 5,  y: 39, w: 12, h: 12, r: '50%' },
    { x: 39, y: 39, w: 12, h: 12, r: '50%' },
    { x: 15, y: 24, w: 26, h: 4,  r: 2, rot: 39 },
    { x: 15, y: 24, w: 26, h: 4,  r: 2, rot: -39 },
  ],
  tags: ['Mesh', 'SDK', 'Local-first'],
},

/* ============ CAMPI — matter on the bench ============ */
{
  slug: 'fusor', name: 'FUSOR', genus: 'campi', status: 'ACTIVE', featured: true,
  repo: null,
  summary: "A modified Elmore–Tuck–Watson approach to a dynomak. Confinement is a rumor the plasma hasn't heard.",
  log: [
    { date: '2026.08.02', text: 'flux conserver machined' },
    { date: '2026.06.28', text: 'ETW modification simmed; helicity injection schedule drafted' },
  ],
  heat: { seed: 29, ramp: 'down' },
  glyph: [
    { x: 8,  y: 8,  w: 40, h: 40, r: '50%', ring: 10 },
    { x: 24, y: 24, w: 8,  h: 8,  r: '50%' },
  ],
  tags: ['Plasma', 'Dynomak', 'Bench physics'],
},
{
  slug: 'ttb', name: 'TTB', genus: 'campi', status: 'DORMANT', featured: true,
  repo: null,
  summary: 'An investigation into the claims of Thomas Townsend Brown. Replicate first; explain never.',
  log: [
    { date: '2026.07.20', text: 'asymmetric capacitor thrust rig, v2' },
    { date: '2026.05.30', text: 'literature audit: most of it evaporates on contact' },
  ],
  heat: { seed: 41, ramp: 'down' },
  glyph: [
    { x: 9,  y: 9,  w: 31, h: 31, r: '12% 88% 30% 70%', rot: 8 },
    { x: 11, y: 36, w: 31, h: 8,  r: 4 },
  ],
  tags: ['Replication', 'Electrostatics', 'Falsification'],
},
{
  slug: 'dream-glasses', name: 'DREAM GLASSES', genus: 'campi', status: 'SHIPPED', featured: true,
  repo: 'MLTQ/dream-glasses',
  summary: 'An open device for flicker potentials: LEDs flickering near brainwave frequencies induce photic entrainment — fantastical geometric closed-eye hallucinations within seconds. Like binaural beats, but much stronger.',
  log: [
    { text: 'a concentric + becomes an X becomes a diamond tunnel to the sky' },
    { text: '3D-printed frames, the cheapest arduino findable, a small battery' },
    { text: "descended from Gysin &amp; Sommerville's 1960s Dream Machine" },
  ],
  heat: { seed: 137, ramp: 'down' },
  glyph: [
    { x: 4,  y: 18, w: 20, h: 20, r: '50%', ring: 5 },
    { x: 32, y: 18, w: 20, h: 20, r: '50%', ring: 5 },
    { x: 23, y: 25, w: 10, h: 5,  r: 3 },
  ],
  tags: ['Open hardware', 'Photic entrainment', 'Wearables'],
},
{
  slug: 'synchroflow', name: 'SYNCHROFLOW', short: 'SYNCHRO', genus: 'campi', status: 'SHIPPED', featured: false,
  repo: null,
  summary: 'Twin Mind: OpenBCI cap → wifi → LED glasses. Copy brainwaves from person A into person B and back, until they synchronize. MIT Reality Hack hardware build.',
  log: [{ text: 'built at MIT Reality Hack' }],
  heat: { seed: 197, ramp: 'down' },
  glyph: [
    { x: 3,  y: 15, w: 26, h: 26, r: '50%', ring: 3 },
    { x: 27, y: 15, w: 26, h: 26, r: '50%', ring: 3 },
    { x: 24, y: 24, w: 8,  h: 8,  r: '50%' },
  ],
  tags: ['EEG', 'OpenBCI', 'Hardware'],
},
{
  slug: 'prints', name: 'PRINTS', genus: 'campi', status: 'ACTIVE', featured: false,
  repo: null,
  summary: '3D-printed apparatus for the experiments — jigs, mounts, chambers. Models released as they survive contact with reality.',
  log: [{ text: 'released only after the part has actually held' }],
  heat: { seed: 199, ramp: 'up' },
  glyph: [
    { x: 12, y: 34, w: 32, h: 6, r: 1 },
    { x: 14, y: 26, w: 28, h: 6, r: 1 },
    { x: 17, y: 18, w: 22, h: 6, r: 1 },
    { x: 21, y: 10, w: 14, h: 6, r: 1 },
  ],
  tags: ['3D printing', 'Apparatus'],
},
{
  slug: 'eedsolver', name: 'EEDSOLVER', short: 'EEDSOLV', genus: 'campi', status: 'SEED', featured: false,
  repo: null,
  summary: 'A solver, gestating.',
  log: [{ text: 'not yet' }],
  heat: { seed: 211, ramp: 'seed' },
  glyph: [
    { x: 17, y: 8,  w: 22, h: 34, r: '50% 50% 50% 50%', rot: 12 },
    { x: 25, y: 44, w: 7,  h: 7,  r: '50%' },
  ],
  tags: [],
},

/* ============ STRATA — representations underneath ============ */
{
  slug: 'jewels', name: 'JEWELS', genus: 'strata', status: 'ACTIVE', featured: true,
  repo: 'MLTQ/jewels',
  summary: 'Video as a set of spacetime primitives — persistent, editable, generated through a dense intermediate. A moving object is one sheared spacetime tube, not a new blob per frame.',
  log: [
    { date: '2026.08.17', text: 'one-shot encoder passes first gate: 23.4 dB on held-out clips' },
    { date: '2026.07.31', text: 'voronoi arm buried; additive renderer stands alone' },
  ],
  heat: { seed: 7, ramp: 'up' },
  glyph: [
    { x: 4,  y: 10, w: 35, h: 35, r: '38% 62% 55% 45%', rot: 24 },
    { x: 23, y: 6,  w: 28, h: 40, r: '60% 40% 45% 55%', rot: -18 },
  ],
  tags: ['Splats', 'Encoders', 'Priors', 'Scaling', 'Falsification'],

  // Long-form page content, stats and media: content/projects/jewels.md
},
{
  slug: 'bobsphog', name: 'BOBSPHOG', genus: 'strata', status: 'ACTIVE', featured: false,
  repo: null,
  summary: 'A spongiform network: a resident skeleton plus demand-paged exact weights, answer quality under a fixed memory budget. A 1.5 TB checkpoint ran in a 38.5 GB peak.',
  log: [{ text: '1.5 TB checkpoint, 38.5 GB peak — exact weights, demand-paged' }],
  heat: { seed: 223, ramp: 'up' },
  glyph: [
    { x: 6,  y: 9,  w: 13, h: 13, r: '50%' },
    { x: 25, y: 4,  w: 9,  h: 9,  r: '50%' },
    { x: 39, y: 13, w: 14, h: 14, r: '50%' },
    { x: 9,  y: 29, w: 11, h: 11, r: '50%' },
    { x: 24, y: 25, w: 15, h: 15, r: '50%' },
    { x: 40, y: 36, w: 12, h: 12, r: '50%' },
    { x: 13, y: 44, w: 8,  h: 8,  r: '50%' },
  ],
  tags: ['Sparsity', 'Memory budgets', 'Inference'],
},

]
