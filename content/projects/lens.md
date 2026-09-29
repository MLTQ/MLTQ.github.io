---
# Page-only fields. Everything else about LENS lives in content/projects.js.
stats:
  26.9B | TERNARY PARAMETERS
  ≤0.05% | ATTENTION DECOMPOSITION ERROR
  39 | ATOMS IT CANNOT NAME
  −5.9 | LOG-P OF “EURO” WITHOUT “ITALY”
media_after_body: true
media:
  lens/grid.jpg | The grid: what each of 64 layers is poised to say at each position of the boot riddle; “Italian” and “Italy” appear mid-stack at “boot”.
  lens/kv-disks.jpg | Every head of layer 39 as a hyperbolic disk, seen down the query of “is”; head 15 puts 99% of its attention on “boot”.
  lens/river.jpg | The river in concept mode: meanings flowing into each token as the sentence streams in, ending in “Italian” and “意大利” at “is”.
  lens/space.jpg | The 248k-token vocabulary as the lens sees it, with the run traced through it.
  lens/anatomy-cylinder.jpg | All 64 blocks stacked into a cylinder between the embedding and the output head, lit by what “is” uses.
links:
  Open the viewer | ../lens/index.html
  Verbalizable representations form a global workspace | https://arxiv.org/pdf/2609.20408
---

The logit lens reads a model's intermediate states with its own output layer. The
Jacobian lens (Gurnee et al. 2026) first carries a layer's state to the output with
the model's averaged Jacobian, J = E[∂h_final / ∂h_layer], and reads much earlier and
more faithfully. LENS applies it to Ternary-Bonsai-2-27B: 64 layers, 48 of them Gated
DeltaNet memory and 16 softmax attention, every weight −1, 0 or +1. The lens was fitted
on 120 FineWeb prompts on one 4090 and is read on a Mac.

**[Open the viewer](../lens/index.html)**: five sentences, pre-rendered with the model's
own continuation, each opening on the position that predicts its answer. The boot riddle
in English (“… is the euro.”) and in Chinese, where the same model answers 巴西雷亚尔, the
Brazilian real. The stream shows why: in Chinese it reads 靴子 as footwear (shoe, 鞋), not
as the outline of Italy. Then a multi-hop capital, a translation, and code. Every view works; what
needs the live model (new prompts, generating, knockouts) is switched off, and the
repository runs all of it locally.

## THE VIEWS

- **Grid / J-Volume**: what each layer at each position is poised to say.
- **Space**: the whole 248k-token vocabulary as the lens sees it, 2,048 non-verbal atoms beside it, and a run traced through both.
- **KV**: every head as a hyperbolic disk, seen down its query: the centre takes all the attention, the rim none.
- **River**: what each token reads from the past, sorted, as the sentence streams in; by source token or by meaning.
- **Race**: every write into a position, exactly, adding up to its final choice.
- **Anatomy**: the 26.9B parameters as discs, flat or stacked into a cylinder: the real ternary weights, what each neuron writes, and what a token actually uses.

## 2026.09.28 — WHAT IT IS MADE OF

About 70% of every block is MLP: 17,408 detector–writer pairs. For a single token,
roughly half of them carry 90% of a block's MLP output, and 31–37 of 48 memory heads
carry 90% of what it reads. Use is dense, not sparse. At layer 57, on “is”, the
busiest neurons write euro, USD, franc, dirham, ruble and Italian.

## 2026.09.26 — WHAT IT ACTUALLY USES

One backward pass scores every concept in every cell by how much the final prediction
depends on it. Checked against real knockouts, the estimate holds for small edits
(about 17% error) and fails for dominant concepts: remove “Italy” from one layer and
the next layers rebuild it. Measured with real knockouts instead, the boot riddle
hinges on one step: Italy at “boot” is worth 5.9 log-prob of “euro”, and no other
concept anywhere in the sentence moves it by more than 0.1.

## 2026.09.25 — WHERE IT READS FROM

Attention and DeltaNet memory decompose exactly into per-head, per-source messages;
summed back, they reproduce every layer to within 0.05%. Layer 39, head 15 carries
“Italian” from “boot” into “is” with 98.6% of its attention.

## 2026.09.24 — WHAT IT CANNOT SAY

After removing everything the lens can read as words, the remainder is dense: a
dictionary of a few thousand directions explains about 57% of it on held-out text.
The model describes its own 2,048 atoms well (median 0.78 AUROC, chance 0.5; a
shuffled-description control scores 0.48), but 39 stay at chance on a threefold
re-test. They are listed in the viewer; some are nameable by a person, which is the
point: the boundary between what it can say and what it only represents can be moved.
