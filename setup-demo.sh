#!/usr/bin/env bash
# Prepare the Codespace for the sentiment-demo workshop.
#
# Deliberately minimal. This script installs the Scrollcase CLI and nothing
# else. It does not install pixi or conda-pack, download the model, create a
# scroll, or build a box -- the workshop does all of that, in the open, by hand.
#
# It is also safe to re-run: it never deletes a workspace you already generated.

set -euo pipefail

SCROLLCASE_VERSION="0.9.1"
WORKSPACE_DIR="workspace"

fail() {
  echo "setup-demo: $*" >&2
  exit 1
}

echo "setup-demo: checking prerequisites"

command -v node >/dev/null 2>&1 || fail "node is not installed"
node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 20 ]; then
  fail "node >= 20 is required, found $(node --version)"
fi
echo "setup-demo: node $(node --version)"

if command -v python3 >/dev/null 2>&1; then
  echo "setup-demo: $(python3 --version)"
elif command -v python >/dev/null 2>&1; then
  echo "setup-demo: $(python --version)"
else
  fail "python is not installed"
fi

echo "setup-demo: installing scrollcase@${SCROLLCASE_VERSION}"
npm install --global --no-fund --no-audit "scrollcase@${SCROLLCASE_VERSION}"

installed="$(scrollcase --version 2>/dev/null || true)"
case "$installed" in
  *"${SCROLLCASE_VERSION}"*) echo "setup-demo: scrollcase ${installed}" ;;
  *) fail "expected scrollcase ${SCROLLCASE_VERSION}, got '${installed:-nothing}'" ;;
esac

if [ -d "$WORKSPACE_DIR" ]; then
  echo "setup-demo: keeping your existing ${WORKSPACE_DIR}/ untouched"
fi

cat <<'EOF'

setup-demo: ready.

Nothing has been built yet. The scrolls and their locks are already in this
repository, so building is two commands -- see README.md:

    scrollcase keygen
    scrollcase build sentiment-demo/linux-x86_64-cpu --weights embed

EOF
