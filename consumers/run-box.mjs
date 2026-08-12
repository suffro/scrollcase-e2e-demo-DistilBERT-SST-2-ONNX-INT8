#!/usr/bin/env node
// Run an already-downloaded sentiment-demo box from Node.
//
// This example owns nothing beyond the call itself: it does not choose a
// release, download a box, fetch model assets, or manage installation. It runs
// exactly the local release/archive pair and public key it is handed.
//
//   node run-box.mjs <release.json> <signing-public.json> <sentence...>
//
// The archive defaults to the content-addressed file sitting next to the
// release document, which is how `scrollcase build` writes it.

import { runBox } from "scrollcase/consumer";

function usage(message) {
  if (message) console.error(`error: ${message}`);
  console.error("usage: node run-box.mjs <release.json> <signing-public.json> <sentence...>");
  process.exit(2);
}

const [releasePath, publicKeyPath, ...words] = process.argv.slice(2);
if (!releasePath || !publicKeyPath || words.length === 0) usage();

const sentence = words.join(" ").trim();
if (!sentence) usage("the sentence is empty");

// Preparation is chatty and belongs on stderr, so the two application lines on
// stdout stay the only thing a caller has to parse.
console.error(`[consumer] release:    ${releasePath}`);
console.error(`[consumer] public key: ${publicKeyPath}`);
console.error("[consumer] verifying signature and extracting the box...");

const result = await runBox(releasePath, {
  publicPath: publicKeyPath,
  args: [sentence],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
  onPrepared: () => console.error("[consumer] signature verified, running the box"),
});

process.exit(result.exitCode ?? 0);
