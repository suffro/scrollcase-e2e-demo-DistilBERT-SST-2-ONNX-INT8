# Build a real model into a Scrollcase box

Sentiment analysis is an AI technique used to read text and automatically determine the emotional tone behind it—specifically whether the opinion expressed is positive, negative, or neutral.

This demo takes **DistilBERT** sentiment analysis AI model fine-tuned on SST-2, quantised to INT8 in ONNX form, and ships it as a signed, self-contained box.

<big> **Follow these steps to create, sign, build and verify the box:** </big>

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
>
> If the `pixi` download fails, run the command again — the checksum is verified before
> anything is installed, so a failed download leaves nothing half-written.

## 3. Create the scroll

The scroll is the box's declarative input: identity, target, and what goes inside. This writes the
skeleton — everything Scrollcase can work out on its own.

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

> You can also use just `scrollcase new scroll` and you will be prompted to enter the info with questions in the terminal.

## 4. Add the model

The command above wrote two files under `scrolls/sentiment-demo/linux-x86_64-cpu/`. What it could
not know is *which* model you are packaging — so that part you write, once, now.

### a. `scroll.json`

Add these fields next to the ones already there. Every URL is pinned to one immutable commit and
checked against its size and hash, so a moved or replaced file fails the build instead of quietly
changing the box. The environment variables keep the box offline at run time, and the self-test is
what the box must be able to import with its own interpreter:

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
],
"environment": {
  "HF_HUB_OFFLINE": "1",
  "TRANSFORMERS_OFFLINE": "1",
  "TOKENIZERS_PARALLELISM": "false"
},
"selfTest": {
  "imports": ["onnxruntime", "tokenizers", "numpy"],
  "files": ["entrypoint.py", "model-cache/distilbert-sst2/model_int8.onnx"]
},
"condaDependencyLicenseAudit": "scrolls/sentiment-demo/linux-x86_64-cpu/conda-licenses.json"
```

Then append the model's licence and notice to the `localFiles` array, which already holds
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

### b. `pixi.toml`

Make the dependency table read:

```toml
[dependencies]
python = "3.11.*"
onnxruntime = ">=1.20,<2"
tokenizers = ">=0.20,<0.22"
numpy = ">=1.26,<3"
```

## 5. Lock and audit

`lock` pins the exact packages; `audit` writes the licence inventory the build will re-check.

```sh
scrollcase lock sentiment-demo/linux-x86_64-cpu

scrollcase audit sentiment-demo/linux-x86_64-cpu --write
```

## 6. Git commit

Scrollcase refuses to build from a dirty Git working tree, so save what you just wrote in a local
commit first:

```sh
git add . && git commit -m "Package DistilBERT SST-2"
```

This Codespace has no remote, so the commit stays here and cannot change the demo repository.

## 7. Sign and build

`keygen` creates your signing key pair: every box is signed, and the public half is what anyone
who receives the box uses to check it. `build` then installs the locked environment, downloads the
model once, checks every hash, packs it all, runs the self-test, and signs the result. It takes a
few minutes.

```sh
scrollcase keygen

scrollcase build sentiment-demo/linux-x86_64-cpu
```

## 8. Verify

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
