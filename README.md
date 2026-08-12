# scrollcase-e2e-demo — DistilBERT SST-2, ONNX INT8

An end-to-end Scrollcase demo built around a real model: DistilBERT fine-tuned on SST-2,
converted to ONNX and quantised to INT8, embedded in a signed, self-contained box that prints

```text
Sentiment: POSITIVE
Confidence: 99.9%
```

- **[Demo page](docs/demos/sentiment-demo.md)** — start here.
- **[Build it in Codespaces](examples/sentiment-demo/codespaces/README.md)** — the workshop, from
  an empty workspace to a signed box you built yourself.
- **[Download a prebuilt box](examples/sentiment-demo/release/README.md)** — the independent
  convenience path.
- **[Source tree](examples/sentiment-demo/)** — scrolls, entrypoint, consumers, legal material,
  and the current [known gaps](examples/sentiment-demo/README.md#known-gaps).

```bash
npm install && npm test
```

The model is **demonstrative**: short English sentences only, with documented biases. Read
[`MODEL_NOTICE.md`](examples/sentiment-demo/shared/MODEL_NOTICE.md) before drawing conclusions
from any output.
