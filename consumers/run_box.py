#!/usr/bin/env python3
"""Run an already-downloaded sentiment-demo box from Python.

The Python mirror of `run-box.mjs`. It owns nothing beyond the call itself: no
release selection, no download, no model fetching, no installation lifecycle.
It runs exactly the local release/archive pair and public key it is handed.

    python run_box.py <release.json> <signing-public.json> <sentence...>

The archive defaults to the content-addressed file sitting next to the release
document, which is how `scrollcase build` writes it.
"""

from __future__ import annotations

import sys

from scrollcase_consumer import run_box

USAGE = "usage: python run_box.py <release.json> <signing-public.json> <sentence...>"


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(USAGE, file=sys.stderr)
        return 2

    release_path, public_key_path, *words = argv
    sentence = " ".join(words).strip()
    if not sentence:
        print("error: the sentence is empty", file=sys.stderr)
        print(USAGE, file=sys.stderr)
        return 2

    # Preparation goes to stderr so stdout carries only the box's two lines.
    print(f"[consumer] release:    {release_path}", file=sys.stderr)
    print(f"[consumer] public key: {public_key_path}", file=sys.stderr)
    print("[consumer] verifying signature and extracting the box...", file=sys.stderr)

    # stdin/stdout/stderr default to None, which inherits this process's
    # streams -- the box writes its two lines straight to the terminal.
    result = run_box(
        release_path,
        public_key_path=public_key_path,
        args=[sentence],
        on_prepared=lambda _prepared: print(
            "[consumer] signature verified, running the box", file=sys.stderr
        ),
    )
    return result.exit_code or 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
