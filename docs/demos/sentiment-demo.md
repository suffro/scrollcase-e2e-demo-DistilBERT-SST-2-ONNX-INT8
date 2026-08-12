# Sentiment demo — DistilBERT SST-2, ONNX INT8

```text
$ scrollcase run "$RELEASE" -- This product is surprisingly easy to use.

Sentiment: POSITIVE
Confidence: 99.9%
```

Two lines. No Python environment to set up, no model to download, no GPU, no container. A signed
box, verified before it runs, that carries its model with it.

## Two ways in

### 1. Build it end to end in Codespaces

The primary path. You start from an empty workspace and do every step yourself — create the
scroll, declare the pinned model assets, lock the environment, audit the licences, sign, build,
verify, run. Nothing is hidden behind a helper script, because the configuration *is* the lesson.
About fifteen minutes.

→ **[Open the workshop](https://github.com/suffro/scrollcase-sentiment-demo-codespace)**

### 2. Download a prebuilt signed box

Independent of the workshop, and it needs neither pixi nor a build. Download the wrapper for your
platform, fetch the public key from this repository over a separate channel, verify, and run.

→ **[Prebuilt boxes](https://github.com/suffro/scrollcase/releases/tag/sentiment-demo-v1)**

## What the demo actually demonstrates

**A signed release, verified before execution.** The release manifest and the archive are checked
against a public key you obtain independently of the download. A box whose bytes changed does not
run.

**The model travels inside the box.** DistilBERT SST-2, converted to ONNX and quantised to INT8,
is embedded from a commit-pinned, hash-checked source. There is no run-time download — and, as
defence in depth, the box declares `HF_HUB_OFFLINE`, `TRANSFORMERS_OFFLINE` and
`TOKENIZERS_PARALLELISM=false`, while the entrypoint imports no Hugging Face client at all.

**Native CPU execution through the box's own Python.** The box ships a Python 3.11 environment
with `onnxruntime`, `tokenizers` and `numpy`, resolved from a committed lock file and inventoried
by a lock-derived licence audit. It runs on your machine, not in a sandbox, and needs about 2 GB
of RAM.

**Two self-tests, two honest guarantees.** At build time the box runs both known sentences through
the real model and asserts their labels — never a fixed percentage. At consumer time,
`verify --self-test` repeats the *signed import* check (`onnxruntime`, `tokenizers`, `numpy`)
using the box's own interpreter. That is the narrower guarantee, deliberately: schema v2 signs
only `imports`, while `files` and `pythonCode` stay builder-only — so proof of real inference for
a downloaded box is what `run` gives you. The wire contract was not widened to make consumers
replay builder-only assertions.

**Three ways to call it.** The CLI, a Node consumer via `runBox` from `scrollcase/consumer`, and a
Python consumer via `scrollcase_consumer.run_box`. All three print the same two lines on stdout
and keep preparation chatter on stderr.

## Scope, and what this model is not for

This is a **demonstration** of box packaging, not a sentiment product.

The model classifies short **English** sentences into `POSITIVE` or `NEGATIVE`. Input beyond 128
tokens is truncated. Its model card documents biases inherited from the training data, including
predictions that differ systematically for sentences mentioning underrepresented populations;
INT8 quantisation does not remove those biases and can itself shift individual predictions.

Do not use it for decisions about people, for moderation, or for any non-English text. The
limitations are documented upstream and shipped inside every box under
`THIRD_PARTY_NOTICES/distilbert/`:

- [Original model card and limitations](https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english#risks-limitations-and-biases)
- [ONNX conversion, pinned revision](https://huggingface.co/onnx-community/distilbert-base-uncased-finetuned-sst-2-english-ONNX/commit/fd49941c1b822846cb14970cdf430a7cfbe0f5b9)

The original checkpoint is Apache-2.0; the conversion is attributed separately, and the box ships
the full licence text alongside the model notice.

## Source

Everything is in [`examples/sentiment-demo/`](../../examples/sentiment-demo/): the shared
entrypoint, the three target scrolls, the consumers, and the workshop bundle that the companion
Codespaces repository is copied from.
