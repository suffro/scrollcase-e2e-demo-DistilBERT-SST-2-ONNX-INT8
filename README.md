# Sentiment demo — a real model in a Scrollcase box

A ready-to-build Scrollcase project. It packages **DistilBERT SST-2** (ONNX, INT8-quantised) into a
signed, self-contained box that classifies an English sentence:

```text
Sentiment: POSITIVE
Confidence: 99.9%
```

The model ships **inside** the box. Nothing is downloaded when it runs, and it executes on the CPU
through the box's own Python — not yours.

---

## Build it

In a Codespace everything is already installed. On your own machine you need Node 20+, then run
`./setup-demo.sh` first.

```bash
scrollcase keygen
scrollcase build sentiment-demo/linux-x86_64-cpu --weights embed
```

The first build takes a few minutes: it installs the locked environment, downloads the model once
and checks its hashes, runs a self-test with two real sentences, then signs the result.

> Building for a different machine? Use `macos-aarch64-cpu` or `windows-x86_64-cpu`. Scrollcase
> only builds for the system it is running on.

## Run it

```bash
RELEASE=$(ls .scrollcase/dist/boxes/sentiment-demo/1.0.0/linux-x86_64-cpu/*.release.json | head -1)

scrollcase verify "$RELEASE" --self-test
scrollcase run "$RELEASE" -- This product is surprisingly easy to use.
```

Your sentence goes after `--`. Try a negative one too:

```bash
scrollcase run "$RELEASE" -- This was a frustrating and disappointing experience.
```

## Run it from Node or Python

Same box, called as a library instead of a command:

```bash
cd consumers
npm ci
node run-box.mjs "../$RELEASE" ../.scrollcase/keys/signing-public.json Great little tool.
```

```bash
cd consumers
pip install -r requirements.txt
python run_box.py "../$RELEASE" ../.scrollcase/keys/signing-public.json Great little tool.
```

## Test it

```bash
npm install
npm test
```

This checks the project without building anything: the three scrolls against the schema Scrollcase
publishes, the file hashes, the commit-pinned model URLs, and the entrypoint's behaviour.

---

## What is in here

```text
scrolls/sentiment-demo/     one directory per target: scroll, pixi manifest, lock, licence audit
box-entrypoints/            the Python that runs inside the box
THIRD_PARTY_NOTICES/        model notice and Apache-2.0 text, shipped inside every box
consumers/                  Node and Python examples
```

Three targets are ready to build: `linux-x86_64-cpu`, `macos-aarch64-cpu`, `windows-x86_64-cpu`.
All CPU-only.

## Prebuilt boxes

Building takes a few minutes. If you just want to run one, signed boxes are published as a
[release](https://github.com/suffro/scrollcase-e2e-demo-DistilBERT-SST-2-ONNX-INT8/releases) —
see [`release/README.md`](release/README.md). That path is independent of everything above.

## Scope and limitations

This is a **demonstration**. The model reads short **English** sentences and answers `POSITIVE` or
`NEGATIVE`. Its model card documents biases affecting underrepresented populations, and INT8
quantisation does not remove them. Do not use it for decisions about people.

Details and attribution: [`THIRD_PARTY_NOTICES/distilbert/MODEL_NOTICE.md`](THIRD_PARTY_NOTICES/distilbert/MODEL_NOTICE.md).
