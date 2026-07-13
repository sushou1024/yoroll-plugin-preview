# Yoroll Workflow Preview Plugin

This repository contains a browser-based developer preview of the Yoroll plugin
for ChatGPT and Codex. It mirrors the ChatCut-style installation handoff: install
the plugin, verify it, create a new task, send a localized startup prompt, switch
to that task, and open Yoroll in the built-in browser.

## Current scope

- Installs as `yoroll-test-plugin`.
- Opens or reuses the canonical entry `https://app.yoroll.ai` in the built-in browser.
- Lets Yoroll resolve its website locale while matching replies to the user's Codex or conversation language.
- Keeps website sign-in inside the browser.
- Can assist with visible, browser-based Yoroll actions.
- Includes no Yoroll MCP server.
- Includes no full Workflow automation yet.

## Repository layout

```text
.agents/plugins/marketplace.json
plugins/yoroll-test-plugin/
  .codex-plugin/plugin.json
  assets/
  skills/yoroll-plugin-basics/SKILL.md
```

The complete agent-executable installation and first-task handoff is in
[`INSTALL.md`](./INSTALL.md).

## Installation

Run these commands with the Codex CLI bundled with the ChatGPT desktop app:

```bash
codex plugin marketplace add https://github.com/sushou1024/yoroll-plugin-preview.git --ref main
codex plugin list --marketplace ennio-yoroll-preview
codex plugin add yoroll-test-plugin@ennio-yoroll-preview
```

For a ChatCut-style test, ask Codex to read `INSTALL.md` and perform every step.
The installation task must create, seed, and open a separate Yoroll task because
newly installed skills are loaded only by a new task.

## Planned next steps

1. Add the full Yoroll Workflow skill when its workflow specification is ready.
2. Add a hosted Yoroll MCP server for project creation and exact editor handoff.
