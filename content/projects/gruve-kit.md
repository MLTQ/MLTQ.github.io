---
# Page-only fields for GRUVE-KIT. Everything else lives in content/projects.js.
stats:
  4 | SDKS, THREE WITH ZERO DEPS
  0 | SERVERS
  3 s | PRESENCE HEARTBEAT
  6 | PLATFORMS, POCKET TO HEADLESS
media:
  gruve-whiteboard.webp | Physical Gong Sim, served from the laptop that made it, with the whiteboard and the encrypted chat drawer composited over the top
  gruve-port-share.webp | Share a port. A game server, SSH, a database: everyone in the net gets a localhost of their own, and the mesh is the cable
---

There is a gap between an app that works on your laptop and an app your
friends can use, and an entire industry lives in it. A build pipeline, a
host, a bill, a URL that strangers can reach. But the app already runs, and
your friends are already people you trust. What is missing is transport and
naming. That is the whole of Gruve.

Install one app. Your machine and whatever is running on it appear on a board
your friends see, and theirs on yours. Click a tile and someone else's project
opens in your window, served from their laptop over a direct encrypted
connection, with cursors, a whiteboard, and a row of faces on top. Nobody
deployed anything. There is no account, and there is no downtime unless
someone trips over a power cable.

The kit is the other half: four SDKs, in JavaScript, Rust, Python and Go,
three of them with no dependencies at all, and the contract they implement.
An app becomes mesh-ready with one POST to its local agent and a heartbeat.
From then on it is reached by name, never by address. `/apps/gong/` is the
gong wherever the gong is. `/svc/tts` is whoever in the net can do text to
speech, yourself first.

## 2026.08.22 — ONE FILE

v0.3.0. A terminal UI for headless boxes, and a single binary: the Rust mesh
daemon is packed inside the Go agent and unpacks itself, content-addressed,
on first run. Copy it to a server and the server is a node.

## 2026.07.14 — EVERY POCKET

v0.2.0, all platforms. A phone cannot spawn a child process, so the daemon is
compiled to a static library and linked into the agent: one native binary
with both inside, and the same start signature over a spawn on the desktop
and a foreign call on iOS and Android. The phones went from hiding hosting to
consuming it. Shared ports and files, from a pocket.

## 2026.06.30 — SIGNED

v0.1.8, the first notarized macOS build, two days after the in-app updater. A
webview running yesterday's lobby is how phantom bugs come back from the
dead, so the lobby does not cache.

## 2026.06.17 — THE CONTRACT

The SDKs split out into their own public repo, with a Python and a Go port
the same day. They ship with a document of rules for apps that want to live
on the mesh, and each rule exists because breaking it produced a real
debugging night. Rule six was born from a haunted play button, clicked a
hundred times a second by a sync loop, and a stereo echo. Also that day, apps
moved to their own origin, so a hostile app cannot reach the lobby's API,
delete a network, or read a chat key.

## 2026.06.16 — RIP OUT THE CONTROL SERVER

The first version enrolled every node into a Headscale control plane over
Tailscale. It worked, and it was a server. A spike on the fourteenth proved
that membership could ride iroh-gossip with no server at all. By the
sixteenth Headscale, tsnet, and the self-hosting module were gone. A network
is now a gossip topic. Every node says its name and its address every three
seconds and forgets anyone silent for twelve. Discovery resolves an ed25519
key to wherever that key is right now, and QUIC punches the hole. Two laptops
on two continents behind two NATs connect the same way as two on a couch.

Two bugs from that week are written into the daemon as comments. Plumtree
demotes quiet links to lazy pushes, which starves a mesh of two, so
broadcasts go to neighbours directly. And a network's creator, subscribed
with nobody to talk to, never promoted a late joiner into its eager view and
saw a roster the joiner did not. So every node re-dials everyone it has ever
seen, every thirty seconds, forever, even when healthy.

## 2026.06.11 — THE CABLE

Share a port. A Minecraft server, SSH, a database, anything listening on this
machine becomes a port on everyone else's, TCP or UDP detected on the way
through. And end-to-end encrypted chat: a drawer along the bottom that stays
open while you move between apps.

## 2026.06.10 — TWO DOORS

The spec had three modes. What shipped is two doors on every tile: Together,
one shared session, or Solo, your own session on their backend. The same day
the agent learned to hold many networks at once, a rail of them down the
side, and got a desktop shell with itself as the sidecar.

## 2026.06.09 — BY NAME

The first real commit was the dispatch layer and the linter. Every app,
upstream, and mesh-wide capability has a name, and the agent resolves it:
local provider first, then whoever in the net announces it, with a hop header
so a request cannot chase its own tail.

## WHAT WAS DESIGNED AND NOT BUILT

The design said CRDTs. What shipped is last-write-wins per key, ordered by
the host's agent, with three rules that both ends enforce. An unchanged value
is dropped before it is sent and again when it arrives. You never hear your
own writes back. And every twenty seconds the two sides compare notes anyway,
because events cross in flight and leave a stable desync where each holds the
other's value. It is not Figma. It is enough for a whiteboard and a garden,
and the CRDT remains an addition, not a contradiction.

The design also said identity would be federated OIDC, because a net owner
should never have to take Gruve's word for which human a node is. What
shipped is no accounts. You are your keypair and the name you typed. The spec
had already noted that an auth outage would lock every net at once. In
hindsight that reads like the reason.

## HONEST EDGES

Moderation is partial. Mute lives in the UI but is not bound to the node key,
and there is no kick or ban, so anyone holding the invite can come back. A
host has to be online to host, which is what hosting means here. And the
no-central-server claim carries exactly one asterisk, the optional invite
shortener, which sees a hash and a ciphertext and nothing else.
