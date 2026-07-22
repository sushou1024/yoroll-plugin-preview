# Yoroll MCP Developer Preview

This repository distributes the test-only Yoroll plugin for Codex. It combines
an agent-assisted first-run handoff, Codex's built-in Browser as a visible DEV
workspace, two anonymous MCP creation cards, and Yoroll's OAuth-protected MCP
business tools.

## Target experience

1. A Codex task reads `INSTALL.md`, installs or updates the plugin, and opens a
   new composer with Yoroll explicitly attached and a localized first-run
   request ready for the user to send once.
2. The installed Skill opens or reuses `https://dev.yoroll.ai` in Codex's
   in-app Browser, explicitly keeps the Browser visible, and preserves the DEV
   tab as the user-facing deliverable.
3. The same turn displays one short welcome paragraph and the anonymous creation
   menu, without a repeated explanation below the card.
4. `render_creation_menu` offers interactive film game, image, video, and other
   request without starting OAuth.
5. Selecting interactive game, image, or video, and returning to the menu,
   navigate silently through a direct app-to-MCP tool call or same-widget
   transition. These actions must not post a follow-up user message or trigger
   a host confirmation dialog.
6. `render_creation_form` loads the current model, genre, style, format, and
   generation settings for the selected intent. The card is the complete
   response; Codex does not append login, creation, or credit-status narration.
7. The card submits directly to `create_project`, `generate_image`, or
   `generate_video`. OAuth begins only when that protected business tool is
   called.
8. Protected submissions stay inside the silent MCP Apps `tools/call` bridge.
   When the current Codex Mac host returns an OAuth challenge instead of opening
   it automatically, the card opens the Yoroll plugin detail page, keeps the
   form and stable idempotency key in private widget state, and retries the exact
   request after the user completes Authenticate and returns. The card never
   posts a follow-up message or technical JSON.

Dialogue speech and background music are not advertised or routed in this
preview's first-run experience.

## Architecture boundaries

- **Installer:** installs the bundle, verifies MCP, creates and opens a new task.
- **Skill:** resolves runtime language, opens the DEV workspace, routes intent,
  coordinates cards, later operation polling, and visible handoff.
- **MCP cards:** collect anonymous creation intent and detailed settings.
- **Protected MCP tools:** own every account, project, workflow, media,
  operation, and publishing action.
- **Browser:** displays Yoroll but never replaces MCP with frontend automation.

The plugin does not define a generic submit endpoint, copy Browser cookies into
MCP, use `/auth/mcp-connect`, or request the legacy `web:session` scope.

## Environment boundary

This preview is fixed to:

- MCP: `https://mcp.yoroll.ai/mcp`
- Web: `https://dev.yoroll.ai`
- API behind MCP: Yoroll test services

Do not repoint it to `app.yoroll.ai`, `api.lineargame.ai`, or a production
origin. Open only ordinary `web_url` values returned by the test MCP.

## Authentication boundary

The marketplace policy is `authentication: ON_USE`. The plugin does not mark
the entire MCP server as authenticated or predeclare global scopes; the
server's per-tool security metadata is the authentication boundary.

- Public: `render_creation_menu`, `render_creation_form`.
- OAuth-protected: account, credits, project, workflow, image/video generation,
  operations, and publishing.
- Browser login state is not treated as proof of MCP authorization.

Credentials, verification codes, cookies, and OAuth tokens never belong in
chat or Skill context.

## Installation

Ask Codex desktop to execute the installer:

```text
Read the complete INSTALL.md in the Yoroll plugin repository, install or update
the Yoroll preview plugin, and open the new creation task for me.
```

Chinese:

```text
完整阅读 Yoroll 插件仓库里的 INSTALL.md，安装或更新 Yoroll 预览插件，并为我打开新的创作任务。
```

The complete execution and fallback contract is in [INSTALL.md](./INSTALL.md).

## Development validation

After changing the plugin:

1. Refresh its Codex cachebuster with the bundled `plugin-creator` helper.
2. Validate the Skill with `skill-creator/scripts/quick_validate.py`.
3. Validate the bundle with `plugin-creator/scripts/validate_plugin.py`.
4. Reinstall the plugin and test from a new Codex task.

Privacy policy: <https://docs.yoroll.ai/yoroll-privacy-policy>

Terms of use: <https://docs.yoroll.ai/yoroll-terms-of-use>
