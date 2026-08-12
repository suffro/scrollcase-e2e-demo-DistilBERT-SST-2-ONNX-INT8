[Scrollcase documentation](https://scrollcase.dev/)

# Scrollcase in this project

Scrollcase turns a declarative [scroll](https://scrollcase.dev/reference/scroll) into a signed,
portable [box](https://scrollcase.dev/reference/box-format) for one [target](https://scrollcase.dev/reference/box-format#targets).

## Usual workflow

Run `npm install scrollcase` to install Scrollcase CLI. Then:

1. `scrollcase init`
2. `scrollcase lock <boxId>/<targetId>`
3. `scrollcase keygen`
4. `scrollcase build <boxId>/<targetId>`
5. `scrollcase verify <release.json> --self-test` or `scrollcase run <release.json>`

See the [CLI reference](https://scrollcase.dev/reference/cli) and
[signing guidance](https://scrollcase.dev/guides/signing-and-custody). The `consumer-templates/`
files demonstrate the [consumer APIs](https://scrollcase.dev/reference/api) against local releases.

## Node consumer

```sh
npm install scrollcase
npm install --save-dev tsx typescript
npx tsx consumer-templates/run-box.ts
```

## Python consumer

npm does not install the Python consumer. A Python-only application does not need the Node CLI:

```sh
python -m pip install scrollcase-consumer
python consumer-templates/run_box.py
```

## Rust consumer

```sh
cargo add --manifest-path consumer-templates/rust/Cargo.toml scrollcase-consumer
cargo run --manifest-path consumer-templates/rust/Cargo.toml
```

[Scrollcase documentation](https://scrollcase.dev/)
