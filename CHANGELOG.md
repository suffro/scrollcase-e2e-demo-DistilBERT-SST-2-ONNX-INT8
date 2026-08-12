# Changelog

## [Unreleased]

### Added

- **A ready-to-build Scrollcase project** for DistilBERT SST-2 (ONNX, INT8). Three target scrolls
  under `scrolls/sentiment-demo/` — `linux-x86_64-cpu`, `macos-aarch64-cpu`,
  `windows-x86_64-cpu` — each with its pixi manifest, committed lock and reviewed licence audit.
  Opening the Codespace and running `keygen` then `build` produces a signed box.
- **The box application** (`box-entrypoints/sentiment-demo/entrypoint.py`): reads a sentence,
  loads the embedded ONNX model on the CPU, prints the label and a one-decimal confidence. It
  imports no Hugging Face client and resolves its files from its own directory.
- **Model assets pinned to an immutable revision**, hash- and size-checked at build time, embedded
  in the box so nothing is downloaded at run time.
- **Model notice and Apache-2.0 text** under `THIRD_PARTY_NOTICES/distilbert/`, hashed into every
  box, attributing the original checkpoint and the ONNX conversion separately and linking the
  documented bias limitations.
- **Node and Python consumer examples** (`consumers/`), pinned to exactly `scrollcase@0.9.1` and
  `scrollcase-consumer==0.4.1`.
- **A build workflow** covering all three targets on native runners: build, verify with the signed
  self-test, run both fixed phrases, exercise both consumers, and assert that a rebuild produces
  no second archive. It publishes nothing.
- **A manual release workflow** that publishes the prebuilt boxes as a draft release, then
  downloads each published wrapper again on a matching host and verifies it.
- **Tests** (`npm test`): the scrolls are validated against the schema the pinned `scrollcase`
  package publishes, plus file hashes, commit-pinned asset URLs, exact consumer pins, no CUDA in
  any lock, and the entrypoint's behaviour through injected fakes — no ML dependencies needed.

### Verified

All three targets pass on native CI runners: build, `verify --self-test`, both fixed phrases, both
consumer examples, and a rebuild that produces no second archive. On `macos-aarch64-cpu` the
archive is ~192 MiB and `run` returns `POSITIVE 99.9%` and `NEGATIVE 100.0%`.

### Not yet done

The dedicated signing key and the published release are separate, manual steps.
