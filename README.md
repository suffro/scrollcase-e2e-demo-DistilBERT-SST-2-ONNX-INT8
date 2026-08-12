# Build a real model into a Scrollcase box

Paste these commands into the terminal to package **DistilBERT SST-2** (ONNX, INT8) into a signed
Linux CPU box, then run it:

```text
Sentiment: POSITIVE
Confidence: 99.9%
```

The model ends up **inside** the box, so it runs with no download and no Python setup of your own.

## 1. Install Scrollcase CLI

```sh
npm install -g scrollcase
```

## 2. Initialize Scrollcase project

`init` creates the workspace. Answer **yes** when it offers to install `pixi` and `conda-pack`.

```sh
scrollcase init --no-example
```

> `--no-example` skips the disposable sample box: here you package a real model instead.

## 3. Create the scroll

The scroll is the box's declarative input — identity, target, and what goes inside.

```sh
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
  --script entrypoint.py
```

`--script` points at the `entrypoint.py` in this repository: it loads the model and prints the
result. Scrollcase hashes its exact bytes into the scroll for you.

## 4. Declare the dependencies

Open `scrolls/sentiment-demo/linux-x86_64-cpu/pixi.toml` and make the dependency table read:

```toml
[dependencies]
python = "3.11.*"
onnxruntime = ">=1.20,<2"
tokenizers = ">=0.20,<0.22"
numpy = ">=1.26,<3"
```

## 5. Declare the model

Open `scrolls/sentiment-demo/linux-x86_64-cpu/scroll.json` and add these fields.

**The model files.** Every URL is pinned to one immutable commit, and every file is checked
against its size and hash, so a moved or replaced artefact fails the build instead of silently
changing the box:

```json
"modelCacheSubdir": "model-cache/distilbert-sst2",
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

**Offline at run time**, so the box cannot reach for the network even by accident:

```json
"environment": {
  "HF_HUB_OFFLINE": "1",
  "TRANSFORMERS_OFFLINE": "1",
  "TOKENIZERS_PARALLELISM": "false"
}
```

**The model's licence and notice**, appended to the `localFiles` array that already holds
`entrypoint.py`:

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

**What the box must be able to import**, checked with the box's own interpreter — and where the
dependency licence inventory lives:

```json
"selfTest": {
  "imports": ["onnxruntime", "tokenizers", "numpy"],
  "files": ["entrypoint.py", "model-cache/distilbert-sst2/model_int8.onnx"]
},
"condaDependencyLicenseAudit": "scrolls/sentiment-demo/linux-x86_64-cpu/conda-licenses.json"
```

## 6. Lock and audit

`lock` pins the exact packages; `audit` writes the licence inventory the build will re-check.

```sh
scrollcase lock sentiment-demo/linux-x86_64-cpu

scrollcase audit sentiment-demo/linux-x86_64-cpu --write
```

## 7. Git commit

Scrollcase refuses to build from a dirty Git working tree, so save what you just wrote in a local
commit first:

```sh
git add . && git commit -m "Package DistilBERT SST-2"
```

This Codespace has no remote, so the commit stays here and cannot change the demo repository.

## 8. Sign and build

The build downloads the model once, checks every hash, packs the environment, and signs the
result. It takes a few minutes.

```sh
scrollcase keygen

scrollcase build sentiment-demo/linux-x86_64-cpu
```

## 9. Verify

```sh
scrollcase verify .scrollcase/dist/boxes/sentiment-demo/1.0.0/linux-x86_64-cpu/*.release.json --self-test
```

**✓ That's it**

---

<br>

## How to run the box

There are 3 ways to run a Scrollcase box. Your sentence goes after `--`:

### a. Scrollcase CLI

```sh
scrollcase run .scrollcase/dist/boxes/sentiment-demo/1.0.0/linux-x86_64-cpu/*.release.json \
  -- This product is surprisingly easy to use.
```

Try a negative one too:

```sh
scrollcase run .scrollcase/dist/boxes/sentiment-demo/1.0.0/linux-x86_64-cpu/*.release.json \
  -- This was a frustrating and disappointing experience.
```

### b. Scrollcase consumers <small> (Node, Python or Rust) </small>

`init` also creates quick **Node, Python, and Rust** examples under `consumer-templates/`. Point one
at the built release and pass the sentence as the box's arguments to run it from an application.

### c. Your custom implementation

<br>

---

### Want the build to fail if the model answers wrong?

Add a `pythonCode` block to `selfTest` and the build will run real predictions before signing:

```json
"pythonCode": "import os, sys\nsys.path.insert(0, os.getcwd())\nfrom entrypoint import predict\nassert predict('This product is surprisingly easy to use.')[0] == 'POSITIVE'\nassert predict('This was a frustrating and disappointing experience.')[0] == 'NEGATIVE'\n"
```

### About the model

DistilBERT fine-tuned on SST-2, converted to ONNX and quantised to INT8. It is a **demonstration**:
short **English** sentences, two labels, and documented biases affecting underrepresented
populations. Do not use it for decisions about people — see [`MODEL_NOTICE.md`](MODEL_NOTICE.md).

---

### Docs quick-links:

[Overview](https://scrollcase.dev/getting-started/overview) ·
[Quickstart](https://scrollcase.dev/getting-started/quickstart) ·
[CLI reference](https://scrollcase.dev/reference/cli) ·
[Consumer APIs](https://scrollcase.dev/reference/api)
