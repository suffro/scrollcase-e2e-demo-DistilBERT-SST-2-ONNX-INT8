// Project checks for the sentiment-demo box.
//
// Static only: they read the committed scrolls, manifests and docs. They never
// build a box, download a model, or run the Scrollcase toolchain. The scroll
// shape is not asserted by hand -- it is validated against the schema published
// by the pinned `scrollcase` package itself.

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCROLLS = join(ROOT, "scrolls", "sentiment-demo");

const REVISION = "fd49941c1b822846cb14970cdf430a7cfbe0f5b9";
const ASSET_BASE =
  "https://huggingface.co/onnx-community/distilbert-base-uncased-finetuned-sst-2-english-ONNX";
const MODEL_CACHE = "model-cache/distilbert-sst2";

const TARGETS = {
  "linux-x86_64-cpu": {
    target: { platform: "linux", arch: "x86_64", accelerator: "cpu" },
    pythonEntryPoint: "venv/bin/python",
    condaPlatform: "linux-64",
  },
  "macos-aarch64-cpu": {
    target: { platform: "macos", arch: "aarch64", accelerator: "cpu" },
    pythonEntryPoint: "venv/bin/python",
    condaPlatform: "osx-arm64",
  },
  "windows-x86_64-cpu": {
    target: { platform: "windows", arch: "x86_64", accelerator: "cpu" },
    pythonEntryPoint: "venv/python.exe",
    condaPlatform: "win-64",
  },
};

// Bytes that must survive a checkout unchanged: hashed into a scroll, or
// compared byte-for-byte by the build.
const EXACT_BYTE_FILES = [
  "entrypoint.py",
  "MODEL_NOTICE.md",
  "APACHE-2.0.txt",
  "conda-licenses.json",
  "pixi.lock",
];

const readText = (...parts) => readFileSync(join(...parts), "utf8");
const readJson = (...parts) => JSON.parse(readText(...parts));
const scrolls = Object.keys(TARGETS).map((t) => [t, readJson(SCROLLS, t, "scroll.json")]);

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

// Guards about what a document *tells you to run* must read the commands, not
// the prose around them.
const fencedCommands = (markdown, language = "bash") =>
  [...markdown.matchAll(new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"))]
    .map((match) => match[1])
    .join("\n");

// Executable lines only: comments and here-document bodies are text the script
// prints, not commands it runs.
const shellCommands = (script) => {
  const kept = [];
  let heredoc = null;
  for (const line of script.split("\n")) {
    if (heredoc !== null) {
      if (line.trim() === heredoc) heredoc = null;
      continue;
    }
    const opened = line.match(/<<-?\s*'?"?([A-Za-z_][A-Za-z0-9_]*)'?"?\s*$/);
    if (opened) {
      heredoc = opened[1];
      continue;
    }
    if (!/^\s*#/.test(line)) kept.push(line);
  }
  return kept.join("\n");
};

test("every scroll validates against the schema published by scrollcase itself", () => {
  const schema = (name) =>
    JSON.parse(readFileSync(require.resolve(`scrollcase/contract/schema/${name}.schema.json`), "utf8"));

  const ajv = new Ajv2020({ strict: false });
  for (const name of ["target", "execution"]) ajv.addSchema(schema(name));
  const validate = ajv.compile(schema("scroll"));

  for (const [target, scroll] of scrolls) {
    assert.ok(validate(scroll), `${target}: ${JSON.stringify(validate.errors, null, 2)}`);
  }
});

test("every scroll carries the fixed identity and version contract", () => {
  for (const [target, scroll] of scrolls) {
    assert.equal(scroll.schemaVersion, 2, target);
    assert.equal(scroll.scrollVersion, "1.0.0", target);
    assert.equal(scroll.boxId, "sentiment-demo", target);
    assert.equal(scroll.modelId, "distilbert-sst2-onnx-int8", target);
    assert.equal(scroll.runtimeId, "onnxruntime-cpu", target);
    assert.equal(scroll.version, "1.0.0", target);
    assert.equal(scroll.sourceRevision, REVISION, target);
    assert.equal(scroll.pythonVersion, "3.11.*", target);
    assert.equal(scroll.pixiVersion, "0.73.0", target);
    assert.equal(scroll.compatibility.minRamGb, 2, target);
    assert.equal(scroll.modelCacheSubdir, MODEL_CACHE, target);
    assert.deepEqual(
      scroll.execution,
      { kind: "python-script", script: "entrypoint.py", defaultArgs: [] },
      target
    );
  }
});

test("targets differ only in target, interpreter and audit path", () => {
  const normalised = scrolls.map(([, scroll]) => {
    const copy = structuredClone(scroll);
    copy.target = "<normalised>";
    copy.pythonEntryPoint = "<normalised>";
    copy.condaDependencyLicenseAudit = "<normalised>";
    return JSON.stringify(copy);
  });
  for (const other of normalised.slice(1)) {
    assert.equal(other, normalised[0], "scrolls drifted outside the permitted per-target fields");
  }
});

test("target, interpreter, audit path and pixi platform agree", () => {
  for (const [target, scroll] of scrolls) {
    const expected = TARGETS[target];
    assert.deepEqual(scroll.target, expected.target, target);
    assert.equal(scroll.pythonEntryPoint, expected.pythonEntryPoint, target);
    assert.equal(
      scroll.condaDependencyLicenseAudit,
      `scrolls/sentiment-demo/${target}/conda-licenses.json`,
      `${target}: the audit path must point at this target's own directory`
    );

    const manifest = readText(SCROLLS, target, "pixi.toml");
    assert.match(
      manifest,
      new RegExp(`^platforms = \\["${expected.condaPlatform}"\\]$`, "m"),
      `${target}: pixi.toml platform disagrees with the scroll target`
    );
  }
});

test("scrolls sit where scrollcase looks for them by default", () => {
  // paths.scrolls is the default, so no command in this project needs
  // --scrolls-dir. Keep it that way: it is one less thing to explain.
  const config = readJson(ROOT, "scrollcase.config.json");
  assert.equal(config.paths.scrolls, "scrolls");
  for (const target of Object.keys(TARGETS)) {
    assert.ok(existsSync(join(SCROLLS, target, "scroll.json")), `${target}: scroll is misplaced`);
  }
});

test("pixi manifests declare python, onnxruntime, tokenizers and numpy", () => {
  for (const target of Object.keys(TARGETS)) {
    const manifest = readText(SCROLLS, target, "pixi.toml");
    for (const dependency of ["python", "onnxruntime", "tokenizers", "numpy"]) {
      assert.match(manifest, new RegExp(`^${dependency} = `, "m"), `${target}: missing ${dependency}`);
    }
    assert.match(manifest, /^python = "3\.11\.\*"$/m, `${target}: python must match the scroll`);
    assert.match(manifest, /^\[workspace\]$/m, `${target}: pixi 0.73 deprecates [project]`);
    assert.doesNotMatch(manifest, /cuda/i, `${target}: manifest must not ask for a CUDA build`);
  }
});

test("every local file matches its declared SHA-256", () => {
  for (const [target, scroll] of scrolls) {
    assert.equal(scroll.localFiles.length, 3, target);
    for (const entry of scroll.localFiles) {
      // sourcePath is repository-relative, which is what keeps one canonical
      // copy of each hashed file instead of one per target.
      const path = join(ROOT, entry.sourcePath);
      assert.ok(existsSync(path), `${target}: missing local file ${entry.sourcePath}`);
      assert.equal(sha256(path), entry.sha256, `${target}: ${entry.sourcePath} hash mismatch`);
    }
  }
});

test("the notice and licence land under THIRD_PARTY_NOTICES/distilbert/", () => {
  for (const [target, scroll] of scrolls) {
    const paths = scroll.localFiles.map((entry) => entry.relativePath);
    assert.ok(paths.includes("entrypoint.py"), target);
    assert.ok(paths.includes("THIRD_PARTY_NOTICES/distilbert/MODEL_NOTICE.md"), target);
    assert.ok(paths.includes("THIRD_PARTY_NOTICES/distilbert/APACHE-2.0.txt"), target);
  }
});

test("asset URLs are commit-pinned and never track a branch", () => {
  for (const [target, scroll] of scrolls) {
    assert.equal(scroll.assets.length, 3, target);
    for (const asset of scroll.assets) {
      assert.ok(asset.url.startsWith(`${ASSET_BASE}/resolve/${REVISION}/`), `${target}: ${asset.url}`);
      assert.doesNotMatch(asset.url, /\/resolve\/main\//, `${target}: ${asset.relativePath} tracks main`);
      assert.match(asset.sha256, /^[0-9a-f]{64}$/, `${target}: ${asset.relativePath} digest`);
      assert.ok(
        Number.isInteger(asset.sizeBytes) && asset.sizeBytes > 0,
        `${target}: ${asset.relativePath} sizeBytes`
      );
      assert.ok(
        asset.relativePath.startsWith(`${MODEL_CACHE}/`),
        `${target}: ${asset.relativePath} is outside the declared model cache`
      );
    }
  }
});

test("asset descriptors are identical across targets", () => {
  const encoded = scrolls.map(([, scroll]) => JSON.stringify(scroll.assets));
  for (const other of encoded.slice(1)) assert.equal(other, encoded[0]);
});

test("every scroll embeds weights and declares the offline environment", () => {
  for (const [target, scroll] of scrolls) {
    assert.equal(scroll.weights, "embed", target);
    assert.deepEqual(
      scroll.environment,
      {
        HF_HUB_OFFLINE: "1",
        TRANSFORMERS_OFFLINE: "1",
        TOKENIZERS_PARALLELISM: "false",
      },
      target
    );
  }
});

test("the entrypoint imports no downloader", () => {
  const source = readText(ROOT, "box-entrypoints", "sentiment-demo", "entrypoint.py");
  for (const forbidden of ["transformers", "huggingface_hub", "requests", "urllib"]) {
    assert.doesNotMatch(
      source,
      new RegExp(`^\\s*(import|from)\\s+${forbidden}\\b`, "m"),
      `entrypoint must not import ${forbidden}`
    );
  }
});

test("the self-test signs the real imports and proves both sentences", () => {
  for (const [target, scroll] of scrolls) {
    // Schema v2 signs only `imports`, so this is the part a consumer repeats.
    assert.deepEqual(scroll.selfTest.imports, ["onnxruntime", "tokenizers", "numpy"], target);

    const code = scroll.selfTest.pythonCode;
    // Pin the sentence *and* its expected label together: a self-test whose
    // labels were swapped still mentions both words, so checking them
    // separately would not notice an inversion in all three scrolls.
    assert.ok(
      code.includes("('This product is surprisingly easy to use.', 'POSITIVE')"),
      `${target}: the positive case is missing or its label was inverted`
    );
    assert.ok(
      code.includes("('This was a frustrating and disappointing experience.', 'NEGATIVE')"),
      `${target}: the negative case is missing or its label was inverted`
    );
    assert.ok(code.includes("math.isfinite(confidence)"), `${target}: confidence must be finite`);
    assert.ok(code.includes("0.0 <= confidence <= 1.0"), `${target}: confidence must be in [0, 1]`);
    assert.doesNotMatch(code, /confidence == /, `${target}: must not assert a fixed confidence`);

    for (const required of [
      "entrypoint.py",
      `${MODEL_CACHE}/model_int8.onnx`,
      `${MODEL_CACHE}/tokenizer.json`,
      `${MODEL_CACHE}/config.json`,
      "THIRD_PARTY_NOTICES/distilbert/MODEL_NOTICE.md",
      "THIRD_PARTY_NOTICES/distilbert/APACHE-2.0.txt",
    ]) {
      assert.ok(scroll.selfTest.files.includes(required), `${target}: selfTest.files misses ${required}`);
    }
  }
});

test("every target ships a lock and its reviewed audit", () => {
  for (const target of Object.keys(TARGETS)) {
    assert.ok(existsSync(join(SCROLLS, target, "pixi.lock")), `${target}: pixi.lock is missing`);
    const inventory = readJson(SCROLLS, target, "conda-licenses.json");
    assert.ok(JSON.stringify(inventory).length > 0, `${target}: the audit is empty`);
  }
});

test("no lock selected a CUDA build", () => {
  // This is a CPU demo. A CUDA onnxruntime would silently add a gigabyte and a
  // GPU requirement, so the locks are the place to catch it.
  for (const target of Object.keys(TARGETS)) {
    const lock = readText(SCROLLS, target, "pixi.lock");
    assert.doesNotMatch(lock, /cuda/i, `${target}: the lock selected a CUDA build`);
    assert.match(lock, /onnxruntime.*_cpu/, `${target}: the lock must pin a CPU onnxruntime build`);
  }
});

test("consumer manifests pin exact versions", () => {
  const pkg = readJson(ROOT, "consumers", "package.json");
  assert.equal(pkg.dependencies.scrollcase, "0.9.1");
  for (const [name, range] of Object.entries(pkg.dependencies)) {
    assert.match(range, /^\d+\.\d+\.\d+$/, `${name} is not an exact version`);
  }

  const lock = readJson(ROOT, "consumers", "package-lock.json");
  assert.equal(lock.packages["node_modules/scrollcase"].version, "0.9.1");

  const requirements = readText(ROOT, "consumers", "requirements.txt");
  assert.match(requirements, /^scrollcase-consumer==0\.4\.1$/m);
  for (const line of requirements.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    assert.match(trimmed, /==\d+\.\d+\.\d+$/, `${trimmed} is not an exact pin`);
  }

  assert.doesNotMatch(
    [JSON.stringify(pkg), requirements].join("\n"),
    /latest/,
    "consumer manifests must never use 'latest'"
  );
});

test("consumers call the real API and keep stdout for the result", () => {
  const node = readText(ROOT, "consumers", "run-box.mjs");
  assert.match(node, /import \{ runBox \} from "scrollcase\/consumer"/);
  // runBox takes the release path positionally; the key option is publicPath.
  assert.match(node, /runBox\(releasePath, \{/);
  assert.match(node, /publicPath: publicKeyPath/);
  assert.match(node, /args: \[sentence\]/);
  for (const stream of ["stdin", "stdout", "stderr"]) {
    assert.match(node, new RegExp(`${stream}: "inherit"`), `run-box.mjs must inherit ${stream}`);
  }
  assert.ok(!/console\.log/.test(node), "preparation output must go to stderr");

  const python = readText(ROOT, "consumers", "run_box.py");
  assert.match(python, /from scrollcase_consumer import run_box/);
  assert.match(python, /run_box\(\n\s+release_path,/);
  assert.match(python, /public_key_path=public_key_path/);
  assert.match(python, /args=\[sentence\]/);
});

test("the README teaches the real commands, in the order they must run", () => {
  const readme = readText(ROOT, "README.md");
  const ordered = [
    "scrollcase keygen",
    "scrollcase build sentiment-demo/linux-x86_64-cpu --weights embed",
    "scrollcase verify",
    "scrollcase run",
    "npm test",
  ];
  let cursor = -1;
  for (const command of ordered) {
    const found = readme.indexOf(command);
    assert.ok(found !== -1, `README is missing: ${command}`);
    assert.ok(found > cursor, `README step out of order: ${command}`);
    cursor = found;
  }

  const commands = fencedCommands(readme);
  // Application arguments go after `--`; without it the sentence is parsed as
  // Scrollcase flags.
  assert.match(commands, /scrollcase run "\$RELEASE" -- /, "the sentence must come after --");
  assert.match(
    commands,
    /\.scrollcase\/dist\/boxes\/sentiment-demo\/1\.0\.0\/linux-x86_64-cpu/,
    "the README must name the real release directory"
  );
  assert.doesNotMatch(commands, /--allow-dirty/, "the README must never teach --allow-dirty");
  assert.doesNotMatch(
    commands,
    /--scrolls-dir/,
    "scrolls sit at the default path, so no command needs this flag"
  );
});

test("the setup script installs only the pinned CLI and keeps an existing workspace", () => {
  const setup = readText(ROOT, "setup-demo.sh");
  assert.match(setup, /scrollcase@\$\{SCROLLCASE_VERSION\}/);
  assert.match(setup, /SCROLLCASE_VERSION="0\.9\.1"/);

  const commands = shellCommands(setup);
  assert.doesNotMatch(commands, /\brm\b/, "setup must never delete a generated workspace");
  for (const forbidden of ["scrollcase build", "scrollcase keygen"]) {
    assert.ok(!commands.includes(forbidden), `setup must not run: ${forbidden}`);
  }
});

test("the devcontainer opens the README and waits only for setup", () => {
  const devcontainer = readJson(ROOT, ".devcontainer", "devcontainer.json");
  assert.deepEqual(devcontainer.customizations.codespaces.openFiles, ["README.md"]);
  assert.equal(devcontainer.postCreateCommand, "bash ./setup-demo.sh");
  assert.equal(devcontainer.waitFor, "postCreateCommand");
});

test("build state and keys stay out of the repository", () => {
  const ignored = readText(ROOT, ".gitignore");
  // An untracked file makes the tree dirty, and `build` refuses a dirty tree.
  assert.match(ignored, /^\.scrollcase\/$/m);
  assert.match(ignored, /^node_modules\/$/m);
});

test("user-facing docs state the scope and link the bias limitations", () => {
  const pages = [
    ["README.md", readText(ROOT, "README.md")],
    ["release/README.md", readText(ROOT, "release", "README.md")],
    [
      "MODEL_NOTICE.md",
      readText(ROOT, "THIRD_PARTY_NOTICES", "distilbert", "MODEL_NOTICE.md"),
    ],
  ];
  for (const [name, text] of pages) {
    assert.match(text, /English/, `${name}: must state the English-only scope`);
    assert.match(text, /bias(es)?/i, `${name}: must mention the documented biases`);
    assert.match(text, /demonstrat/i, `${name}: must state that this is demonstrative`);
  }
  const notice = pages[2][1];
  assert.ok(
    notice.includes("distilbert/distilbert-base-uncased-finetuned-sst-2-english"),
    "the notice must name the original checkpoint"
  );
  assert.ok(notice.includes(REVISION), "the notice must pin the conversion revision");
  assert.match(notice, /Apache-2\.0/);
});

test("exact-byte files are protected from line-ending rewrites", () => {
  const attributes = readText(ROOT, ".gitattributes");
  for (const name of EXACT_BYTE_FILES) {
    assert.match(
      attributes,
      new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+-text$`, "m"),
      `${name} must be marked -text: a Windows checkout would otherwise rewrite its bytes`
    );
  }
});
