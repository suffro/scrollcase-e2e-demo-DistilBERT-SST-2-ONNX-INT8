# Build a real model into a Scrollcase box

Sentiment analysis is an AI technique used to read text and automatically determine the emotional tone behind it—specifically whether the opinion expressed is positive, negative, or neutral.

This demo takes **DistilBERT** sentiment analysis AI model fine-tuned on SST-2, quantised to INT8 in ONNX form, and ships it as a signed, self-contained box.

<big> **Follow these steps to create, sign, build, verify and run the box:** </big>

## 1. Install Scrollcase CLI

```sh
npm install -g scrollcase
```

## 2. Initialize Scrollcase project

`init` creates the workspace, then asks one question:

```sh
scrollcase init --no-example
```

| It asks | Answer |
| --- | --- |
| This project needs pixi and conda-pack to build a box.<br>Install them into …/.scrollcase/toolchain? [Y/n] | `Y` (just press Enter) |

---

That is the only prompt here. `--no-example` skips the disposable sample box — you are packaging a
real model instead — and the questions about the Node, Python and Rust consumer templates come with
that sample, so they do not appear either.

> Both tools land **inside the project**, under `.scrollcase/toolchain/`. Nothing is installed
> system-wide and nothing is added to `PATH`; deleting that directory undoes it.
>
> If the `pixi` download fails, run the command again — the checksum is verified before anything is
> installed, so a failed download leaves nothing half-written.

## 3. Create the scroll

The **scroll** is the box's declarative input: identity, target, the model to fetch, and what the
box must be able to do. You do not write it by hand — you build it up with commands.

### 3a. The skeleton

```sh
scrollcase new scroll --python-version 3.11
```

It asks you a short set of questions — use ↑/↓ and Enter on the menus:

| It asks | Answer |
| --- | --- |
| Which **target**? | `linux-x86_64-cpu` |
| **Box ID** | `sentiment-demo` |
| **Upstream revision** | `fd49941c1b822846cb14970cdf430a7cfbe0f5b9` |
| **Asset base URL** | `https://assets.example.org/boxes` |
| Which **weights mode**? | `embed` |
| Which **execution kind**? | `python-script` |
| Which **script source**? | `existing project script` |
| **Script path** | `entrypoint.py` |

---

That is the whole list, and every one of them is something nothing else could answer: what this box
is for, what it is called, which version of the model is inside, where you will publish it, and what
runs when someone starts it. The model and runtime identity, the box version, the pixi version and
the interpreter path are all filled in for you.

The one flag is `--python-version 3.11`: the newer default would otherwise be used, and this model's
ONNX stack was tested on 3.11 for this demo. It has to be set at creation time because it goes into
`pixi.toml` as well as the scroll.

You now have `scrolls/sentiment-demo/linux-x86_64-cpu/` with three files: `scroll.json`, its
`pixi.toml`, and a starter `self_test.py`.

One thing this particular demo chooses: `entrypoint.py` looks for the model in
`model-cache/distilbert-sst2`, so tell the scroll to put it there. Every field is editable this way —
run `scrollcase edit scroll` with no flags and it lists them.

```sh
scrollcase edit scroll sentiment-demo \
  --field modelCacheSubdir --value model-cache/distilbert-sst2
```

### 3b. The model

Each `add asset` **downloads the file once** and records the size and SHA-256 it actually found.
Those two values are the reason a scroll used to be painful to write: nobody can know them without
fetching the file. The first command pulls 67 MB, so give it a moment.

```sh
HF=https://huggingface.co/onnx-community/distilbert-base-uncased-finetuned-sst-2-english-ONNX/resolve/fd49941c1b822846cb14970cdf430a7cfbe0f5b9

scrollcase add asset sentiment-demo $HF/onnx/model_int8.onnx
scrollcase add asset sentiment-demo $HF/tokenizer.json
scrollcase add asset sentiment-demo $HF/config.json
```

Every URL is pinned to one immutable commit, and from now on the recorded hash is checked on every
build — a replaced file upstream fails the build instead of quietly changing the box.

### 3c. The files that ship with it

```sh
scrollcase add file sentiment-demo MODEL_NOTICE.md \
  --to THIRD_PARTY_NOTICES/distilbert/MODEL_NOTICE.md

scrollcase add file sentiment-demo APACHE-2.0.txt \
  --to THIRD_PARTY_NOTICES/distilbert/APACHE-2.0.txt
```

`entrypoint.py` is already in the scroll — `--script` put it there.

### 3d. The dependencies

```sh
scrollcase add dep sentiment-demo onnxruntime --version ">=1.20,<2"
scrollcase add dep sentiment-demo tokenizers  --version ">=0.20,<0.22"
scrollcase add dep sentiment-demo numpy       --version ">=1.26,<3"
```

These go into `pixi.toml`. The exact versions are pinned by `pixi.lock` in the next step, not by
these ranges.

### 3e. The environment and the self-test

The box runs offline — the model is inside it, so nothing should reach out to a hub at run time:

```sh
scrollcase add env sentiment-demo HF_HUB_OFFLINE=1
scrollcase add env sentiment-demo TRANSFORMERS_OFFLINE=1
scrollcase add env sentiment-demo TOKENIZERS_PARALLELISM=false
```

And it must be able to import what it was built for. These three names are signed into the release,
so anyone receiving the box can re-check them:

```sh
scrollcase add import sentiment-demo onnxruntime
scrollcase add import sentiment-demo tokenizers
scrollcase add import sentiment-demo numpy
scrollcase remove import sentiment-demo json
```

The last line drops the placeholder `new scroll` started you with.

Now open `scrolls/sentiment-demo/linux-x86_64-cpu/self_test.py` — the one file here that is yours to
write, because it is the check that decides whether this box is worth signing — and replace it with:

```python
"""Self-test: the box must classify both sentences correctly, or it is not signed."""

import math
import os
import sys

sys.path.insert(0, os.getcwd())

from entrypoint import predict

CASES = (
    ("This product is surprisingly easy to use.", "POSITIVE"),
    ("This was a frustrating and disappointing experience.", "NEGATIVE"),
)

for sentence, expected in CASES:
    label, confidence = predict(sentence)
    assert label == expected, f"{sentence!r}: expected {expected}, got {label}"
    assert math.isfinite(confidence), f"{sentence!r}: confidence is not finite"
    assert 0.0 <= confidence <= 1.0, f"{sentence!r}: confidence {confidence} outside [0, 1]"

print("self-test ok")
```

This is the check that matters: it runs both sentences through the real model with the box's own
interpreter, so a box that answers wrong is never signed.

> **Look at what you did not write.** No `pythonEntryPoint` — the target admits only one. No file
> sizes, no hashes, no `selfTest.files` list: the `add` commands recorded all of it. The only file
> you opened in an editor is `self_test.py`, which is real Python rather than a string with escaped
> newlines — and it is the one thing here that is genuinely a decision.
>
> Packaging the same model for Linux, macOS and Windows does not mean doing this three times. Put
> what they share in `scrolls/sentiment-demo/scroll.json` and give each target a short file that
> declares `"extends": "../scroll.json"` plus its own differences — see
> [one box, several targets](https://scrollcase.dev/reference/scroll#one-box-several-targets).

<details>
<summary><b>The same thing without any questions</b> — for CI, or to paste in one go</summary>

<br>

Every answer above is also a flag. Nothing here is interactive, which is what a pipeline needs:

```sh
scrollcase new scroll \
  --target linux-x86_64-cpu \
  --box-id sentiment-demo \
  --source-revision fd49941c1b822846cb14970cdf430a7cfbe0f5b9 \
  --asset-base-url https://assets.example.org/boxes \
  --weights embed \
  --execution python-script --script entrypoint.py \
  --python-version 3.11

scrollcase edit scroll sentiment-demo \
  --field modelCacheSubdir --value model-cache/distilbert-sst2

HF=https://huggingface.co/onnx-community/distilbert-base-uncased-finetuned-sst-2-english-ONNX/resolve/fd49941c1b822846cb14970cdf430a7cfbe0f5b9
scrollcase add asset sentiment-demo $HF/onnx/model_int8.onnx
scrollcase add asset sentiment-demo $HF/tokenizer.json
scrollcase add asset sentiment-demo $HF/config.json

scrollcase add file sentiment-demo MODEL_NOTICE.md \
  --to THIRD_PARTY_NOTICES/distilbert/MODEL_NOTICE.md
scrollcase add file sentiment-demo APACHE-2.0.txt \
  --to THIRD_PARTY_NOTICES/distilbert/APACHE-2.0.txt

scrollcase add dep sentiment-demo onnxruntime --version ">=1.20,<2"
scrollcase add dep sentiment-demo tokenizers  --version ">=0.20,<0.22"
scrollcase add dep sentiment-demo numpy       --version ">=1.26,<3"

scrollcase add env sentiment-demo HF_HUB_OFFLINE=1
scrollcase add env sentiment-demo TRANSFORMERS_OFFLINE=1
scrollcase add env sentiment-demo TOKENIZERS_PARALLELISM=false

scrollcase add import sentiment-demo onnxruntime
scrollcase add import sentiment-demo tokenizers
scrollcase add import sentiment-demo numpy
scrollcase remove import sentiment-demo json
```

The other flags — `--model-id`, `--runtime-id`, `--version`, `--pixi-version` and the
`compatibility` ones — exist too, and are left out here on purpose: each has a default worth
taking. `scrollcase help` lists them all.

`self_test.py` is still yours to write — see 3e.

</details>

## 4. Lock and audit

`lock` pins the exact packages; `audit` writes the licence inventory the build will re-check.

```sh
scrollcase lock sentiment-demo/linux-x86_64-cpu

scrollcase audit sentiment-demo/linux-x86_64-cpu --write
```

## 5. Git commit

Scrollcase refuses to build from a dirty Git working tree, so save what you just wrote in a local
commit first:

```sh
git add . && git commit -m "Package DistilBERT SST-2"
```

This Codespace has no remote, so the commit stays here and cannot change the demo repository.

## 6. Sign and build

`keygen` creates your signing key pair: every box is signed, and the public half is what anyone
who receives the box uses to check it. `build` then installs the locked environment, fetches the
model, checks every hash against what the scroll pins, packs it all, runs the self-test, and signs
the result. It takes a few minutes.

> The model is downloaded again here. `add asset` fetched it to find out what it was; `build` fetches
> it to put it in the box, and checks it against the hash recorded then. There is no cache between
> the two on purpose — the build starts from a clean scratch tree every time, which is part of what
> makes rebuilding the same commit produce a byte-identical box.

```sh
scrollcase keygen

scrollcase build sentiment-demo/linux-x86_64-cpu
```

## 7. Verify

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
