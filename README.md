# Yoroll MCP plugin

This repository distributes the Yoroll plugin for Codex. It combines an
agent-assisted first-run handoff, Codex's built-in Browser as a visible Yoroll
workspace, one anonymous MCP intent card, and Yoroll's OAuth-protected MCP
business tools.

## Target experience

1. A Codex task reads `INSTALL.md`, installs or updates the plugin, and opens a
   new composer with Yoroll explicitly attached and a localized first-run
   request ready for the user to send once.
2. The installed Skill creates a one-time root handoff from the MCP OAuth
   identity, opens or reuses `https://app.yoroll.ai` in Codex's in-app Browser,
   and preserves that signed-in Yoroll tab as the user-facing deliverable.
3. The same turn displays one short welcome paragraph and the anonymous creation
   menu, without a repeated explanation below the card.
4. `render_creation_menu` itself remains public and offers interactive film
   game, image, video, and other request without requiring a business action.
5. Selecting an option silently updates model context; it does not post a user
   message or open a second card. Codex reads the current headless
   `get_creation_options` catalog and collects the remaining parameters in
   natural-language conversation.
6. The root handoff reuses an OAuth grant established during store installation,
   or lets the host establish it once on first use. The in-app Browser redeems
   its own session without asking for Yoroll credentials again.
7. Codex polls the returned operation. On success, MCP creates a short-lived,
   one-time browser handoff that establishes the same account's Yoroll browser
   session and redirects to the completed project or media page.
8. When a completion reply contains an MCP-confirmed Yoroll project or media URL,
   Codex opens it in the right-side Browser by reusing the existing Yoroll tab,
   or the current Browser tab when no Yoroll tab exists. It creates a tab only
   when there is no tab to reuse.

Dialogue speech and background music are not advertised or routed in this
plugin's first-run experience.

## Architecture boundaries

- **Installer:** installs the bundle, verifies MCP, creates and opens a new task.
- **Skill:** resolves runtime language, opens the Yoroll workspace, routes intent,
  coordinates cards, later operation polling, and visible handoff.
- **MCP card:** collects only anonymous creation intent.
- **Headless creation options:** provide current models, supported choices, and
  defaults to the conversation without rendering another card.
- **Protected MCP tools:** own every account, project, workflow, media,
  operation, and publishing action.
- **Browser:** redeems a short-lived MCP identity handoff into a separate
  read-only web session, displays MCP-confirmed Yoroll results, reuses one
  visible tab instead of accumulating route tabs, and never replaces MCP with
  frontend automation.

The plugin does not define a generic submit endpoint, copy cookies between
browser profiles, or use `/auth/mcp-connect`. The protected handoff tool requests
`web:session`; without an operation ID it can only land at the Yoroll root, and with
one it can only use the succeeded operation's server-verified destination.

## Production environment boundary

The plugin is fixed to:

- MCP: `https://mcp.yoroll.ai/mcp`
- Web: `https://app.yoroll.ai`
- API behind MCP: `https://api.lineargame.ai`

Browser handoffs must come only from the production MCP and are never copied
into chat. Development and production origins must never be mixed.

## Authentication boundary

The repository marketplace policy is `authentication: ON_USE`; the published
store listing may establish OAuth during installation. In either case, the
first-run root handoff reuses the grant when present and otherwise lets the host
perform the one standards-based OAuth flow. Public card tools remain public at
the MCP protocol boundary.

- Public/model-visible: `render_creation_menu`, `get_creation_options`.
- User-visible MCP App: `render_creation_menu` only.
- OAuth-protected: account, credits, project, workflow, image/video generation,
  operations, and publishing.
- Browser login state is not treated as proof of MCP authorization.

Credentials, verification codes, cookies, and OAuth tokens never belong in
chat or Skill context.

## Installation

Ask Codex desktop to execute the installer:

```text
Read the complete INSTALL.md in the Yoroll plugin repository, install or update
the Yoroll plugin, and open the new creation task for me.
```

Chinese:

```text
完整阅读 Yoroll 插件仓库里的 INSTALL.md，安装或更新 Yoroll 插件，并为我打开新的创作任务。
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
