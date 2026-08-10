#!/bin/sh
# Mint a fresh cache-busting plugin version before every install.
#
# Codex desktop caches installed plugins per manifest version, and the app's
# plugin manifest snapshot refreshes only on a full app restart. Re-installing
# the same version string silently keeps stale cards and skills alive. This
# script automates what used to be a manual edit: it rewrites the plugin
# manifest version to `<base>+codex.<current timestamp>` so every install is a
# brand-new version to Codex. (Ported from ChatFate's installer, which stamps
# a unique version per release and verifies it after `plugin add`.)
#
# Safe to run any number of times. It reads nothing outside this repository;
# the base version (the part before `+`) is preserved as committed, only the
# `+codex.<timestamp>` build suffix changes. The resulting change to
# plugin.json in the working tree is expected and does not need to be
# committed.
#
# Prints the minted version on stdout so callers can verify the installed
# plugin reports exactly this version afterwards.
set -eu

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
MANIFEST="$REPO_ROOT/plugins/yoroll-test-plugin/.codex-plugin/plugin.json"

[ -f "$MANIFEST" ] || {
  printf '%s\n' "plugin manifest not found: $MANIFEST" >&2
  exit 1
}
command -v node >/dev/null 2>&1 || {
  printf '%s\n' 'Node.js is required to refresh the plugin version.' >&2
  exit 1
}

# Version suffix derives from the plugin content hash (manifest excluded):
# unchanged content keeps the same version, so the desktop's manifest snapshot
# stays valid across reinstalls and tasks never hit "skill path does not
# exist"; changed content mints a new version and busts the cache exactly when
# needed.
PLUGIN_DIR="$REPO_ROOT/plugins/yoroll-test-plugin"
CONTENT_HASH=$(cd "$PLUGIN_DIR" && find . -type f ! -path './.codex-plugin/plugin.json' -print0 \
  | sort -z | xargs -0 shasum -a 256 | shasum -a 256 | cut -c1-12)
node -e '
  const fs = require("node:fs");
  const [manifestPath, contentHash] = process.argv.slice(1);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    console.error("plugin.json has no valid version field");
    process.exit(1);
  }
  const base = manifest.version.split("+", 1)[0];
  if (!/^\d+\.\d+\.\d+$/.test(base)) {
    console.error(`unexpected base version: ${base}`);
    process.exit(1);
  }
  manifest.version = `${base}+codex.${contentHash}`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  process.stdout.write(manifest.version + "\n");
' "$MANIFEST" "$CONTENT_HASH"
