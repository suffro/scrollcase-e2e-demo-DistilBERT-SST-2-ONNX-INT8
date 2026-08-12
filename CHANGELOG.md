# Changelog

All notable changes to this repository are documented here.

## [Unreleased]

### Added

- **Sentiment demo (`examples/sentiment-demo/`)** — an end-to-end demo built around DistilBERT
  SST-2 in ONNX INT8 form, with a shared `entrypoint.py`, three target scrolls
  (`linux-x86_64-cpu`, `macos-aarch64-cpu`, `windows-x86_64-cpu`), and Node and Python consumer
  examples pinned to exact versions. The `hello-box` demo is unchanged.
- **Codespaces workshop (`examples/sentiment-demo/codespaces/`)** — the canonical source of the
  companion repository. It builds a Linux box from an empty workspace through explicit guided
  edits, and does not depend on the prebuilt release.
- **Model notice and licence** — `MODEL_NOTICE.md` and the full Apache-2.0 text, hashed and
  shipped in every box under `THIRD_PARTY_NOTICES/distilbert/`, attributing the original
  checkpoint and the ONNX conversion separately, with the documented bias limitations linked.
- **Demo page (`docs/demos/sentiment-demo.md`)** — two independent calls to action: build it in
  Codespaces, or download a prebuilt signed box.
- **Native build workflow** — all three CPU targets, on a weekly schedule and on relevant pushes.
  It builds, verifies, runs both fixed phrases, exercises both consumers, and asserts that a
  rebuild produces no second archive. It publishes nothing.
- **Manual release workflow** — draft by default, with a dedicated demo signing key kept out of
  the workspace, and a post-upload matrix that downloads the published wrapper again and verifies
  it on a matching host.
- **Contract and entrypoint test suites** — `npm test` validates all three scrolls against the
  schema published by the pinned `scrollcase` package itself, then proves the fixed identity
  contract, the permitted per-target differences, the local-file hashes, commit-pinned asset URLs,
  exact consumer pins, the real consumer API calls, and the workshop's command order and
  documented paths; the Python suite proves argument handling, label mapping, stable softmax and
  output formatting through injected fakes, with no ML dependencies installed.

- **Locked environments and licence audits** — `pixi.lock` and `conda-licenses.json` for all three
  targets, resolved with pixi 0.73.0. Every target pins a CPU `onnxruntime` build; no lock
  selected CUDA, and a test now enforces that.

### Not yet included

The companion Codespaces repository, the dedicated signing key and the published release belong
to later, separately authorized phases. See the *Known gaps* section of
[`examples/sentiment-demo/README.md`](examples/sentiment-demo/README.md#known-gaps) — they are
absent rather than estimated.
