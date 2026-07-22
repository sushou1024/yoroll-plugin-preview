# Yoroll MCP Developer Preview

This repository distributes the test-only Yoroll plugin for Codex. It combines
an agent-assisted first-run handoff, Codex's built-in Browser as a visible DEV
workspace, one anonymous MCP intent card, and Yoroll's OAuth-protected MCP
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
5. Selecting an option silently updates model context; it does not post a user
   message or open a second card. Codex collects the remaining parameters in
   natural-language conversation.
6. OAuth is deferred until the user confirms a creation and Codex calls the
   matching protected tool. The host owns the standards-based OAuth flow.
7. Codex polls the returned operation. On success, MCP creates a short-lived,
   one-time browser handoff that establishes the same account's DEV browser
   session and redirects to the completed project or media page.

Dialogue speech and background music are not advertised or routed in this
preview's first-run experience.

## Architecture boundaries

- **Installer:** installs the bundle, verifies MCP, creates and opens a new task.
- **Skill:** resolves runtime language, opens the DEV workspace, routes intent,
  coordinates cards, later operation polling, and visible handoff.
- **MCP card:** collects only anonymous creation intent.
- **Protected MCP tools:** own every account, project, workflow, media,
  operation, and publishing action.
- **Browser:** displays Yoroll but never replaces MCP with frontend automation.

The plugin does not define a generic submit endpoint, copy Browser cookies into
MCP, or use `/auth/mcp-connect`. The protected handoff tool requests
`web:session` only alongside an actual confirmed creation.

## Environment boundary

This preview is fixed to:

- MCP: `https://mcp.yoroll.ai/mcp`
- Web: `https://dev.yoroll.ai`
- API behind MCP: Yoroll test services

Do not repoint it to `app.yoroll.ai`, `api.lineargame.ai`, or a production
origin. Browser handoffs must come only from the test MCP and are never copied
into chat.

## Authentication boundary

The marketplace policy is `authentication: ON_USE`. Public onboarding remains
anonymous; the server's per-tool security metadata triggers OAuth only for the
first confirmed protected action.

- Public/model-visible: `render_creation_menu`.
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
