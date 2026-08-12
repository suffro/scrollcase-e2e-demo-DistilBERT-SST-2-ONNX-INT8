# DistilBERT sentiment demo box

```text
sentiment-demo-1.0.0-<target>/
├── box/
│   ├── <archive sha256>.zip          the box
│   └── <document sha256>.release.json the signature
├── run-box.mjs                       Node example
├── run_box.py                        Python example
├── package.json, package-lock.json, requirements.txt
└── README.md                         this file
```

Both files in `box/` are content-addressed: the release document commits to the archive by size
and SHA-256, and the archive's own name is that hash.

## The public key is deliberately not in here

A signature is worth nothing if the key travels with it. Get the public key from the repository
instead, over a channel independent of this download:

```bash
curl -fsSLO https://raw.githubusercontent.com/suffro/scrollcase-e2e-demo-DistilBERT-SST-2-ONNX-INT8/main/keys/sentiment-demo-public.json
```

## Verify, then run

```bash
npm install --global scrollcase@0.9.1

RELEASE="$(ls box/*.release.json | head -1)"

scrollcase verify "$RELEASE" --public-key sentiment-demo-public.json --self-test
scrollcase run "$RELEASE" --public-key sentiment-demo-public.json \
  -- This product is surprisingly easy to use.
```

Your sentence goes after `--`. Expected output — two lines on stdout, nothing else:

```text
Sentiment: POSITIVE
Confidence: 99.9%
```

The percentage is whatever the model returns; it is not a fixed value.

`verify --self-test` extracts to a temporary directory and repeats the *signed import* check with
the box's own interpreter. Actual inference is what `run` proves.

## From Node or Python

```bash
npm ci
node run-box.mjs "$RELEASE" sentiment-demo-public.json Great little tool.
```

```bash
pip install -r requirements.txt
python run_box.py "$RELEASE" sentiment-demo-public.json Great little tool.
```

## What is inside the box

- DistilBERT SST-2, ONNX, INT8-quantised, embedded — **no download at run time**.
- Its own Python 3.11 environment; execution is native CPU, no GPU and no container.
- `THIRD_PARTY_NOTICES/distilbert/` with the model notice, the Apache-2.0 text, and the
  lock-derived conda dependency licence inventory.

Requires roughly 2 GB of RAM. `run` refuses a non-native target: each box is built and proven on
the hardware it ships for.

## Scope and limitations

This is a **demonstration**. The model classifies short **English** sentences as `POSITIVE` or
`NEGATIVE`, and its model card documents biases that affect underrepresented populations. Do not
use it for decisions about people. Read `THIRD_PARTY_NOTICES/distilbert/MODEL_NOTICE.md` inside
the box.
