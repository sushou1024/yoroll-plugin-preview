#!/bin/bash
# One-shot installer for the Yoroll plugin (local-checkout mode).
#
# Absorbs the mechanical steps that INSTALL.md used to spell out as prose:
# mint a cache-busting plugin version, fully refresh the marketplace entry,
# reinstall the plugin, verify the installed version matches the minted one
# (retrying the refresh cycle once), and sweep cached versions older than
# 7 days. The installing agent only needs to run this script, check the exit
# code, and read the final machine-readable line:
#
#   INSTALL_OK version=<minted version>
#
# Any non-zero exit means the install did not complete; the script prints
# diagnostics before exiting.
#
# Requires: macOS bash 3.2+, Node.js, and the Codex CLI bundled with the
# ChatGPT desktop app. Safe to re-run any number of times.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

MARKETPLACE_NAME="ennio-yoroll-preview"
PLUGIN_NAME="yoroll-test-plugin"
PLUGIN_SELECTOR="$PLUGIN_NAME@$MARKETPLACE_NAME"

# Always use the Codex CLI bundled with the desktop app; never a Homebrew,
# npm, or unrelated `codex` executable.
CODEX_BIN="/Applications/ChatGPT.app/Contents/Resources/codex"
if [ ! -x "$CODEX_BIN" ]; then
  echo "error: Codex CLI not found at $CODEX_BIN" >&2
  echo "error: install or update the ChatGPT desktop app, then rerun this script" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "error: Node.js is required (used to mint and verify the plugin version)" >&2
  exit 1
fi

echo "==> Repo root: $REPO_ROOT"

# --- a. Mint a fresh cache-busting version -------------------------------
# Codex desktop caches installed plugins per manifest version and refreshes
# its manifest snapshot only on a full app restart, so every install must
# carry a brand-new version string.
echo "==> Minting a fresh plugin version"
MINTED_VERSION=$(sh "$SCRIPT_DIR/refresh-plugin-version.sh")
echo "    minted version: $MINTED_VERSION"

# --- b-e. Full marketplace + plugin refresh ------------------------------
# The remove steps may fail on a first install; that is expected and ignored.
refresh_install() {
  echo "==> Removing installed plugin (failure is fine on first install)"
  "$CODEX_BIN" plugin remove "$PLUGIN_SELECTOR" >/dev/null 2>&1 \
    || echo "    (plugin was not installed; continuing)"

  echo "==> Removing marketplace entry (failure is fine on first install)"
  "$CODEX_BIN" plugin marketplace remove "$MARKETPLACE_NAME" >/dev/null 2>&1 \
    || echo "    (marketplace was not configured; continuing)"

  echo "==> Adding marketplace from local checkout"
  "$CODEX_BIN" plugin marketplace add "$REPO_ROOT"

  echo "==> Installing $PLUGIN_SELECTOR"
  "$CODEX_BIN" plugin add "$PLUGIN_SELECTOR"
}

# Print the installed-and-enabled version of the Yoroll plugin, or fail.
installed_version() {
  "$CODEX_BIN" plugin list --json | node -e '
    const fs = require("node:fs");
    const data = JSON.parse(fs.readFileSync(0, "utf8"));
    const entry = (data.installed || []).find(
      (p) => p.pluginId === "yoroll-test-plugin@ennio-yoroll-preview"
    );
    if (!entry || entry.installed !== true || entry.enabled !== true) process.exit(1);
    if (typeof entry.version !== "string" || entry.version.length === 0) process.exit(1);
    process.stdout.write(entry.version);
  '
}

refresh_install

# --- f. Verify the cache was actually broken -----------------------------
echo "==> Verifying installed version"
INSTALLED_VERSION=$(installed_version || true)
if [ "$INSTALLED_VERSION" != "$MINTED_VERSION" ]; then
  echo "    installed version '$INSTALLED_VERSION' != minted '$MINTED_VERSION'; retrying once"
  refresh_install
  INSTALLED_VERSION=$(installed_version || true)
fi
if [ "$INSTALLED_VERSION" != "$MINTED_VERSION" ]; then
  echo "error: Codex still serves a stale plugin version after one retry" >&2
  echo "error: expected $MINTED_VERSION, got '${INSTALLED_VERSION:-<not installed>}'" >&2
  echo "error: ask the user to fully quit and reopen the ChatGPT/Codex desktop app, then rerun this script" >&2
  echo "----- diagnostics: codex plugin list --json -----" >&2
  "$CODEX_BIN" plugin list --json >&2 || true
  exit 1
fi
echo "    installed and enabled at $INSTALLED_VERSION"

# --- g. Sweep stale cached plugin versions -------------------------------
# Retention is by age, not by count: a running desktop session may still
# resolve skill paths inside any version installed since the last app
# restart, so only versions older than 7 days are deleted. The freshly
# installed version is never deleted. Only this plugin's cache is touched.
CODEX_DATA_HOME=${CODEX_HOME:-"$HOME/.codex"}
CACHE_ROOT="$CODEX_DATA_HOME/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME"
echo "==> Sweeping cached versions older than 7 days in $CACHE_ROOT"
if [ -d "$CACHE_ROOT" ]; then
  find "$CACHE_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +7 -print | \
  while IFS= read -r STALE_DIR; do
    [ -n "$STALE_DIR" ] || continue
    STALE_NAME=$(basename -- "$STALE_DIR")
    [ "$STALE_NAME" = "$MINTED_VERSION" ] && continue
    echo "    removing stale cached version: $STALE_NAME"
    rm -rf -- "$STALE_DIR" \
      || echo "    warning: could not remove $STALE_DIR (continuing)"
  done
else
  echo "    (no cache directory yet; nothing to sweep)"
fi

echo "INSTALL_OK version=$MINTED_VERSION"
