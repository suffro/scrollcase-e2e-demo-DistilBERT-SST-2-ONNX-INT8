# sentiment-demo — DistilBERT SST-2, ONNX INT8

A signed, self-contained box that classifies a short English sentence and prints two lines:

```text
Sentiment: POSITIVE
Confidence: 99.9%
```

The model and tokenizer are **embedded**. Nothing is downloaded at run time, and the box executes
natively on the CPU through its own Python 3.11 environment.

There are two independent ways to meet this demo:

1. **Build it end to end in Codespaces** — the primary workshop, from an empty workspace to a
   signed box you built yourself. See [`codespaces/README.md`](codespaces/README.md).
2. **Download a prebuilt signed box** — a convenience path that depends on nothing above. See
   [`release/README.md`](release/README.md).

## Layout

```text
examples/sentiment-demo/
├── shared/               canonical hashed payload files (one copy, no duplicates)
│   ├── entrypoint.py
│   ├── MODEL_NOTICE.md
│   └── APACHE-2.0.txt
├── consumers/            Node and Python examples that run an existing box
├── codespaces/           the workshop bundle, source of truth for the companion repo
├── release/              README shipped inside each published wrapper
├── linux-x86_64-cpu/     scroll + pixi manifest per target
├── macos-aarch64-cpu/
└── windows-x86_64-cpu/
```

`shared/` holds the single canonical copy of every hashed file: each scroll's `localFiles`
`sourcePath` is repository-relative and points here, so a hash can only be wrong in one place.

This tree doubles as a scrolls directory, so the targets are built with
`--scrolls-dir examples` and referenced as `sentiment-demo/<targetId>` — the same way the
Scrollcase documentation shows for building its shipped examples.

## The contract

| Field | Value |
| --- | --- |
| `boxId` | `sentiment-demo` |
| `modelId` | `distilbert-sst2-onnx-int8` |
| `runtimeId` | `onnxruntime-cpu` |
| `version` / `scrollVersion` | `1.0.0` |
| `sourceRevision` | `fd49941c1b822846cb14970cdf430a7cfbe0f5b9` |
| `pythonVersion` / `pixiVersion` | `3.11.*` / `0.73.0` |
| `weights` | `embed` |
| `compatibility.minRamGb` | `2` |
| `assetBaseUrl` | `https://assets.example.org/boxes` |
| `modelCacheSubdir` | `model-cache/distilbert-sst2` |

The three scrolls are identical except for `target`, `pythonEntryPoint` and
`condaDependencyLicenseAudit`. `npm test` asserts exactly that, so a stray edit to one target
cannot drift from the others unnoticed.

| Target | `target` | `pythonEntryPoint` | pixi platform |
| --- | --- | --- | --- |
| `linux-x86_64-cpu` | linux / x86_64 / cpu | `venv/bin/python` | `linux-64` |
| `macos-aarch64-cpu` | macos / aarch64 / cpu | `venv/bin/python` | `osx-arm64` |
| `windows-x86_64-cpu` | windows / x86_64 / cpu | `venv/python.exe` | `win-64` |

## Two self-tests, two different guarantees

- **Build time**: `selfTest.pythonCode` runs both known sentences through the real model and
  asserts their labels and that each confidence is finite and within `[0, 1]` — never a fixed
  percentage. `selfTest.files` proves pruning did not drop the model or the notices.
- **Consumer time**: `verify --self-test` repeats the *signed import* check
  (`onnxruntime`, `tokenizers`, `numpy`) with the box's own interpreter. Schema v2 signs only
  `imports`; `files` and `pythonCode` are explicitly builder-only. Proof of real inference for a
  downloaded box is what `run` gives you.

The wire contract was not widened to make consumers replay builder-only assertions.

## The model

DistilBERT fine-tuned on SST-2, converted to ONNX and quantised to INT8 by the community, pinned
to an immutable revision. This is a **demonstration**: short English sentences, two labels, and
documented biases affecting underrepresented populations. Read
[`shared/MODEL_NOTICE.md`](shared/MODEL_NOTICE.md) before drawing conclusions from any output.

## Tests

```bash
npm install
npm test
```

The contract suite validates all three scrolls against the **schema published by the pinned
`scrollcase` package itself**, then checks the fixed identity contract, the permitted per-target
differences, the local-file hashes, commit-pinned asset URLs, exact consumer pins, the real
consumer API calls, and the workshop's command order and documented paths.

The entrypoint suite exercises argument joining, blank-input rejection, label mapping, stable
softmax and output formatting through injected fakes, so it needs **no ML dependencies** — that
seam is why `main(argv, predict_fn)` takes a predictor.

## The locked environment

All three locks were resolved with pixi 0.73.0 and are committed next to their manifests, with the
reviewed licence inventory beside each one. Python resolves to **3.11.15** and every target pins a
**CPU** `onnxruntime` 1.28.0 build — no lock selected CUDA, and `npm test` enforces that.

One consequence worth knowing: `tokenizers` pulls `huggingface_hub` in transitively, so a
downloader library *is* present in the box's environment. That is exactly why the offline
environment variables are declared and why the entrypoint imports no Hugging Face client — the
guarantee comes from the code and the signed environment, not from the library being absent.

## Measured, not estimated

One real box has been built and run: `macos-aarch64-cpu`, on an Apple Silicon host, as a scratch
build from a deliberately dirty tree (recorded as `sourceTreeDirty: true`, never published).

| Observation | Value |
| --- | --- |
| archive | 201,599,434 bytes (~192 MiB) |
| signed release document | 2,759 bytes |
| build-time self-test | `self-test ok` — both sentences, real inference |
| `verify --self-test` | passed; the three declared variables show as `[release]` |
| `run` positive | `Sentiment: POSITIVE` / `Confidence: 99.9%` |
| `run` negative | `Sentiment: NEGATIVE` / `Confidence: 100.0%` |
| `run` with blank input | exit code 2, usage on stderr |
| Node and Python consumers | both printed the same two lines, exit 0 |
| rebuild | byte-identical: same archive hash `22c39df1f9…`, no second file |

`Confidence: 100.0%` is the honest one-decimal rounding of the model's output, not a claim of
certainty. Linux and Windows numbers are deliberately absent: `build` refuses a non-native target,
so those come from CI.

## Known gaps

Phases 1 and 2 of the plan are done. What remains needs the later, separately authorized phases
and is therefore *absent rather than guessed*:

| Gap | Why | Unblocked by |
| --- | --- | --- |
| companion Codespaces repository | `suffro/scrollcase-sentiment-demo-codespace` | phase 3 |
| `sentiment-demo.pub.json` | the dedicated demo signing key, never the `hello-box` one | phase 4 |
| published release assets | manual dispatch, draft first | phase 5 |
| Linux and Windows build evidence | `build` refuses a non-native target, so those two are proven by CI, not from a laptop | CI run |
