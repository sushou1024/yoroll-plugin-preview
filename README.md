# Yoroll MCP Developer Preview

This repository distributes the test-only Yoroll plugin for Codex. It provides
two anonymous MCP App cards for choosing and configuring a creation, then uses
Yoroll's existing OAuth-protected MCP business tools for all account, project,
workflow, media, operation, and publishing actions.

## Architecture

The interaction is intentionally split into three layers:

1. `render_creation_menu` shows interactive game, image, video, and other request.
2. `render_creation_form` shows the current test-environment settings for one
   explicit intent. Model capabilities come from the MCP server rather than the
   Skill.
3. The card submits to `create_project`, `generate_image`, or `generate_video`.
   Those existing tools remain the only business implementation and trigger
   OAuth when required.

The plugin does not define a generic submit tool, pair a Browser, or automate
the Yoroll platform frontend. Existing workflow tools, operation semantics,
revision checks, idempotency keys, credit confirmation, and publishing rules
remain unchanged.

## Environment boundary

This preview is fixed to:

- MCP: `https://mcp.yoroll.ai/mcp`
- Web links returned by tools: `https://dev.yoroll.ai`
- API behind MCP: Yoroll test services

Do not repoint it to `app.yoroll.ai`, `api.lineargame.ai`, or any production
origin.

## Authentication boundary

The marketplace policy is `authentication: ON_USE`.

- Public: `render_creation_menu`, `render_creation_form`.
- OAuth-protected: account, credits, project, workflow, media generation,
  operation, and publishing tools.
- No Browser pairing scope is requested.

Invalid supplied bearer tokens still fail. Anonymous access applies only when
no bearer is supplied and never bypasses tool-level authorization.

## Repository layout

```text
.agents/plugins/marketplace.json
plugins/yoroll-test-plugin/
  .codex-plugin/plugin.json
  .mcp.json
  assets/
  skills/yoroll-plugin-basics/SKILL.md
```

## Install and validate

See [INSTALL.md](./INSTALL.md) for installation and the end-to-end acceptance
test.

During development, refresh the plugin cachebuster and validate both the plugin
and Skill with the bundled `plugin-creator` and `skill-creator` scripts before
publishing a preview update.

Privacy policy: <https://docs.yoroll.ai/yoroll-privacy-policy>

Terms of use: <https://docs.yoroll.ai/yoroll-terms-of-use>
