# Build a signed sentiment box, end to end

You are in a Codespace with Node and Python already installed and the Scrollcase CLI pinned to
`0.9.1`. Nothing has been built for you — that is the point. In about fifteen minutes you will
turn an empty workspace into a **signed, self-contained box** that runs DistilBERT SST-2 on the
CPU and prints:

```text
Sentiment: POSITIVE
Confidence: 99.9%
```

The confidence you see is whatever the model actually returns. It is not a fixed number, and
this workshop never asks you to match one.

Everything below is copy-paste. No helper script hides the model-specific configuration: you will
write the scroll and the pixi manifest yourself, because that is the part worth understanding.

---

## What you are building

| Field | Value |
| --- | --- |
| Box id | `sentiment-demo` |
| Target | `linux-x86_64-cpu` |
| Model id | `distilbert-sst2-onnx-int8` |
| Runtime id | `onnxruntime-cpu` |
| Box version | `1.0.0` |
| Python | `3.11.*` |
| pixi | `0.73.0` |
| Weights | `embed` (the model ships inside the box) |
| Source revision | `fd49941c1b822846cb14970cdf430a7cfbe0f5b9` |
| Asset base URL | `https://assets.example.org/boxes` |

The model is a **demonstration** model: English sentences only, two labels, documented biases.
Read `MODEL_NOTICE.md` in this repository before you draw conclusions from any output.

---

## 1. Initialise the workspace

```bash
scrollcase init --no-example --install-toolchain --pixi-version 0.73.0
```

`--no-example` skips the disposable `example-box`. `--install-toolchain` fetches pixi `0.73.0` and
`conda-pack` into `.scrollcase/toolchain/`, checking pixi's published SHA-256 before installing
anything; this is the slow step, so let it finish.

## 2. Create the scroll

Every material value is passed explicitly, so the command works the same in a terminal and in CI:

```bash
scrollcase new scroll \
  --target linux-x86_64-cpu \
  --box-id sentiment-demo \
  --model-id distilbert-sst2-onnx-int8 \
  --runtime-id onnxruntime-cpu \
  --version 1.0.0 \
  --scroll-version 1.0.0 \
  --source-revision fd49941c1b822846cb14970cdf430a7cfbe0f5b9 \
  --python-version '3.11.*' \
  --pixi-version 0.73.0 \
  --min-host-app-version 1.0.0 \
  --min-ram-gb 2 \
  --asset-base-url https://assets.example.org/boxes \
  --weights embed \
  --execution python-script \
  --script entrypoint.py \
  --script-destination entrypoint.py
```

`--script` points at the `entrypoint.py` tracked in this repository. Scrollcase hashes its exact
bytes into `localFiles` for you — you never paste that hash by hand.

This writes `scrolls/sentiment-demo/linux-x86_64-cpu/` containing `scroll.json` and `pixi.toml`.

## 3. Add the four conda dependencies

Open `scrolls/sentiment-demo/linux-x86_64-cpu/pixi.toml` and make the dependency table read
exactly:

```toml
[dependencies]
python = "3.11.*"
onnxruntime = ">=1.20,<2"
tokenizers = ">=0.20,<0.22"
numpy = ">=1.26,<3"
```

These are deliberately loose ranges. The lock file you generate in step 5 is what pins the exact
packages.

## 4. Configure the scroll

Open `scrolls/sentiment-demo/linux-x86_64-cpu/scroll.json` and add the fields below.

**4a. Where the model lives inside the box:**

```json
"modelCacheSubdir": "model-cache/distilbert-sst2"
```

**4b. The model assets.** Every URL is pinned to an immutable commit — never `main` — and every
file is size- and hash-checked, so a moved or replaced upstream artefact fails the build instead
of quietly changing the box:

```json
"assets": [
  {
    "url": "https://huggingface.co/onnx-community/distilbert-base-uncased-finetuned-sst-2-english-ONNX/resolve/fd49941c1b822846cb14970cdf430a7cfbe0f5b9/onnx/model_int8.onnx",
    "relativePath": "model-cache/distilbert-sst2/model_int8.onnx",
    "sizeBytes": 67537148,
    "sha256": "1bc93de9f1da185c67028dbac37df6c14939256e0851d28e8f9c2994d338ac4c"
  },
  {
    "url": "https://huggingface.co/onnx-community/distilbert-base-uncased-finetuned-sst-2-english-ONNX/resolve/fd49941c1b822846cb14970cdf430a7cfbe0f5b9/tokenizer.json",
    "relativePath": "model-cache/distilbert-sst2/tokenizer.json",
    "sizeBytes": 711396,
    "sha256": "d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66"
  },
  {
    "url": "https://huggingface.co/onnx-community/distilbert-base-uncased-finetuned-sst-2-english-ONNX/resolve/fd49941c1b822846cb14970cdf430a7cfbe0f5b9/config.json",
    "relativePath": "model-cache/distilbert-sst2/config.json",
    "sizeBytes": 786,
    "sha256": "27475a0750e539c105a51c59dbef1f0ab75615b0a06e96f2f4d585c46f160c2f"
  }
]
```

**4c. The offline environment.** Defence in depth: the entrypoint already imports no downloader,
and these variables make that visible and enforceable:

```json
"environment": {
  "HF_HUB_OFFLINE": "1",
  "TRANSFORMERS_OFFLINE": "1",
  "TOKENIZERS_PARALLELISM": "false"
}
```

**4d. The legal files.** Append these to the `localFiles` array that `new scroll` already created
for the entrypoint:

```json
{
  "sourcePath": "MODEL_NOTICE.md",
  "relativePath": "THIRD_PARTY_NOTICES/distilbert/MODEL_NOTICE.md",
  "sha256": "eb945ca2676fe6faeafb708bedb0e5846ac4fad27449c43ddabadef886a6a5ba"
},
{
  "sourcePath": "APACHE-2.0.txt",
  "relativePath": "THIRD_PARTY_NOTICES/distilbert/APACHE-2.0.txt",
  "sha256": "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4"
}
```

**4e. The self-test and the audit path:**

```json
"selfTest": {
  "imports": ["onnxruntime", "tokenizers", "numpy"],
  "files": [
    "entrypoint.py",
    "model-cache/distilbert-sst2/model_int8.onnx",
    "model-cache/distilbert-sst2/tokenizer.json",
    "model-cache/distilbert-sst2/config.json",
    "THIRD_PARTY_NOTICES/distilbert/MODEL_NOTICE.md",
    "THIRD_PARTY_NOTICES/distilbert/APACHE-2.0.txt"
  ],
  "pythonCode": "import math\nimport os\nimport sys\n\nsys.path.insert(0, os.getcwd())\n\nfrom entrypoint import predict\n\nCASES = (\n    ('This product is surprisingly easy to use.', 'POSITIVE'),\n    ('This was a frustrating and disappointing experience.', 'NEGATIVE'),\n)\n\nfor sentence, expected in CASES:\n    label, confidence = predict(sentence)\n    assert label == expected, f'{sentence!r}: expected {expected}, got {label}'\n    assert math.isfinite(confidence), f'{sentence!r}: confidence is not finite'\n    assert 0.0 <= confidence <= 1.0, f'{sentence!r}: confidence {confidence} outside [0, 1]'\n\nprint('self-test ok')\n"
},
"condaDependencyLicenseAudit": "scrolls/sentiment-demo/linux-x86_64-cpu/conda-licenses.json"
```

Note what is signed and what is not: schema v2 signs **only** `imports`, so that is the part a
consumer can repeat. `files` and `pythonCode` are builder-only checks.

## 5. Lock the environment

```bash
scrollcase lock sentiment-demo/linux-x86_64-cpu
```

Open the generated `pixi.lock` and check that **no CUDA build was selected** — this is a CPU demo,
and a CUDA `onnxruntime` would quietly add a gigabyte and a GPU requirement.

## 6. Audit the dependency licences

```bash
scrollcase audit sentiment-demo/linux-x86_64-cpu --write
```

This writes the inventory to the path you declared, for you to review and commit. `build` later
recomputes it and fails on any difference, so licence review happens when dependencies change
rather than at the end of a multi-gigabyte build.

## 7. Create a signing key

```bash
scrollcase keygen
```

This writes `.scrollcase/keys/signing-private.pem` (owner-only) and
`.scrollcase/keys/signing-public.json`. It is a throwaway workshop key: never commit the private
half. `build` refuses to start if no key exists — it never creates identity material for you.

## 8. Commit, so the build has clean provenance

`build` refuses a dirty tree unless you pass `--allow-dirty`, which is recorded in the box as
`sourceTreeDirty: true`. Committing instead means your box carries honest clean provenance — which
is why this workshop never teaches that flag. Dirty detection includes untracked files.

```bash
git config user.email >/dev/null 2>&1 || git config user.email demo@example.invalid
git config user.name  >/dev/null 2>&1 || git config user.name  "Scrollcase demo"

git add -A
git commit -m "Configure the sentiment-demo box"
git status --porcelain   # must print nothing
```

## 9. Build the box

```bash
scrollcase build sentiment-demo/linux-x86_64-cpu --weights embed
```

This installs the locked environment, packs and relocates it, downloads the pinned model once and
verifies every hash, re-checks the licence audit, runs the signed imports and your two real
inferences with the box's own interpreter, archives deterministically, and signs the release. It
takes a few minutes.

## 10. Verify and run

```bash
RELEASE="$(ls .scrollcase/dist/boxes/sentiment-demo/1.0.0/linux-x86_64-cpu/*.release.json | head -1)"
echo "$RELEASE"

scrollcase verify "$RELEASE" --self-test
scrollcase run "$RELEASE" -- This product is surprisingly easy to use.
```

Application arguments come after `--`; everything before it belongs to Scrollcase.

`verify --self-test` extracts to a temporary directory and repeats the *signed import* check with
the box's own interpreter. It deliberately does **not** repeat your `pythonCode` or `files`
assertions — those are builder-only. Proof of real inference for a downloaded box is what `run`
gives you.

Expected output — two lines, nothing else:

```text
Sentiment: POSITIVE
Confidence: 99.9%
```

Try the negative sentence too:

```bash
scrollcase run "$RELEASE" -- This was a frustrating and disappointing experience.
```

## 11. Optional — run the same box from Node and Python

```bash
cd consumers
npm install
node run-box.mjs "../$RELEASE" ../.scrollcase/keys/signing-public.json \
  This product is surprisingly easy to use.
```

```bash
python3 -m pip install -r requirements.txt
python3 run_box.py "../$RELEASE" ../.scrollcase/keys/signing-public.json \
  This product is surprisingly easy to use.
```

Both print the same two lines on stdout. Everything they say about verification and preparation
goes to stderr, so a caller only has to parse the result.

---

## What you proved

- The box is **signed** and verified before it runs.
- The model and tokenizer are **embedded**; nothing is downloaded at run time.
- It executes natively on the CPU through the box's **own Python**, not yours.
- Its dependency licences and model notice travel **with the box**.

## Where to go next

Nothing here depends on the prebuilt GitHub Release. If you would rather download a signed box
than build one, that path is documented separately in [`../release/README.md`](../release/README.md).
