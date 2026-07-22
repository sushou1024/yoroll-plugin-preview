# Install the Yoroll MCP Developer Preview

This is an agent-executable installer for Codex desktop. Read the complete file,
perform the steps, and keep the installation task quiet. Do not stop after
printing commands.

## Completion contract

Installation is complete only when all of the following are true:

1. The `ennio-yoroll-preview` marketplace is configured from either the local
   checkout that contains this file or the canonical Git repository at
   `https://github.com/sushou1024/yoroll-plugin-preview.git` on `main`.
2. `yoroll-test-plugin@ennio-yoroll-preview` is installed and enabled.
3. Yoroll MCP is enabled at `https://mcp.yoroll.ai/mcp`.
4. A new Codex composer is opened with the Yoroll plugin explicitly attached
   and the localized first-run request ready to send.

Do not enter credentials, grant consent, call Yoroll business tools, open
Yoroll, create content, or spend credits on the user's behalf inside the
installation task. Authentication is deferred until the first confirmed
protected action. The installed Skill owns first-run
onboarding in the new task.

## Host and CLI

Continue only in the Codex desktop app on the user's local machine. If the host
is a web or isolated remote task, ask the user to run this installer from Codex
desktop instead.

Use the Codex CLI bundled with the desktop app for every command:

```text
/Applications/ChatGPT.app/Contents/Resources/codex
```

Do not substitute a Homebrew, npm, or unrelated `codex` executable.

## Marketplace source

Prefer the local checkout when this file is available on the host filesystem.
Run `git rev-parse --show-toplevel` with the directory containing this
`INSTALL.md` as the working directory, and use the returned absolute path as
`REPO_ROOT`. Confirm that both `INSTALL.md` and
`.agents/plugins/marketplace.json` exist under that root. Never guess a home
directory, username, or checkout path.

If this file is not in a local Git checkout, use the canonical Git source
`https://github.com/sushou1024/yoroll-plugin-preview.git` with ref `main`.
These are the only two supported source modes.

## Install or update

Inspect the configured marketplaces first:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" plugin marketplace list --json
```

If `ennio-yoroll-preview` already points to the selected source mode, reuse it.
If that name points somewhere else, remove the installed Yoroll plugin when
present, remove only that marketplace entry, and then add the selected source.
Do not remove or rewrite unrelated marketplaces. For an existing Git source,
refresh it with `plugin marketplace upgrade` before reinstalling.

For a local checkout, substitute the resolved absolute path for `$REPO_ROOT`:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" plugin marketplace add \
  "$REPO_ROOT"
```

When no local checkout exists, add the canonical Git source:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" plugin marketplace add \
  https://github.com/sushou1024/yoroll-plugin-preview.git --ref main
```

Install or refresh the plugin from the selected marketplace:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" plugin add \
  yoroll-test-plugin@ennio-yoroll-preview
```

Verify it with:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" plugin list --json
"/Applications/ChatGPT.app/Contents/Resources/codex" mcp get yoroll
```

The plugin must be installed and enabled. In local mode, `source.path` and
`marketplaceSource.source` must resolve under the discovered `REPO_ROOT`. In Git
mode, `marketplaceSource.source` must identify the canonical repository and the
configured ref must be `main`. Yoroll MCP must be enabled with Streamable HTTP
at `https://mcp.yoroll.ai/mcp`. It may correctly report `Not logged in` because
authentication is intentionally deferred until protected use.

## Resolve the first-run language

Use this priority without asking the user:

1. A language explicitly requested by the user.
2. The Codex interface or user locale when exposed by the host.
3. The language of the user's latest message.
4. English when no language can be inferred.

Use the matching title and initial message below. For another language,
translate the English version faithfully and keep `Yoroll` unchanged.

### Chinese

Title:

```text
使用 Yoroll 创作
```

Initial message:

```text
[@Yoroll MCP Preview](plugin://yoroll-test-plugin@ennio-yoroll-preview) 开始使用 Yoroll。
```

### English

Title:

```text
Create with Yoroll
```

Initial message:

```text
[@Yoroll MCP Preview](plugin://yoroll-test-plugin@ennio-yoroll-preview) Get started with Yoroll.
```

## Create and open the Yoroll task

The newly installed plugin is not loaded into the installation task. A new
plugin-backed task is mandatory. A plain `create_thread` prompt does not attach
the plugin, even when its text contains the plugin Markdown reference, so do not
use task-management tools for this handoff.

Open Codex's supported new-task deep link for the resolved language:

Chinese:

```bash
open 'codex://new?prompt=%5B%40Yoroll%20MCP%20Preview%5D(plugin%3A%2F%2Fyoroll-test-plugin%40ennio-yoroll-preview)%20%E5%BC%80%E5%A7%8B%E4%BD%BF%E7%94%A8%20Yoroll%E3%80%82'
```

English:

```bash
open 'codex://new?prompt=%5B%40Yoroll%20MCP%20Preview%5D(plugin%3A%2F%2Fyoroll-test-plugin%40ennio-yoroll-preview)%20Get%20started%20with%20Yoroll.'
```

For another language, percent-encode the complete translated initial message
as the `prompt` query parameter without changing the plugin Markdown reference.
The deep link must show the orange Yoroll plugin chip in the composer. The host
does not expose a supported way for an installer task to silently send a newly
attached plugin prompt, so leave the localized request ready and ask the user to
send it once. Do not replace this with an unbacked automatically sent task.

## First-run behavior in the new task

The installed Skill must:

1. Select Codex's in-app Browser explicitly, open or reuse the exact DEV homepage
   `https://dev.yoroll.ai`, set Browser visibility to `true`, and keep that tab
   as a `deliverable` so it remains visible beside the task. After that final
   Browser handoff, do not hide, close, disconnect, reselect, refocus, or make
   another Browser call in the turn.
2. Keep the process quiet. If a progress update is required, use only
   `正在打开 Yoroll…` in Chinese or `Opening Yoroll…` in English. Do not narrate
   Skill loading, installation checks, login rules, Browser internals,
   visibility checks, retries, or MCP tool names.
3. In that same assistant turn, show the anonymous creation menu and return only
   one short localized welcome paragraph. In Chinese use: `Yoroll 插件已经安装好了。现在你可以使用 Yoroll 创建互动影游，也可以用它生成图片和视频；有其他需求也可以直接告诉我。`
   Do not add bullets, a second question, or another explanation below the card.
4. If the initial user request already names interactive game, image, or video,
   skip the menu and collect parameters naturally in conversation.
5. When the user chooses an option in the menu, update model-only context and
   keep the same card. Do not show a detailed form, send a follow-up prompt, or
   open a host confirmation dialog.
6. Read current models, supported choices, and safe defaults from the headless
   `get_creation_options` tool, then collect only the needed parameters in
   natural-language conversation.
7. Defer OAuth until the user confirms the effective parameters and the first
   protected creation tool is called.
8. Keep every business action in MCP. Browser is a visible workbench, not an
   automation fallback.
9. Poll a successful project, image, or video operation, select Codex's in-app
   Browser explicitly, call `create_browser_handoff`, and immediately open its
   exact one-time URL in the existing Yoroll DEV tab. Wait for the redirect and
   keep the resulting project or media page as the visible deliverable.
10. Keep stable idempotency across any post-OAuth retry. Never expose JSON,
   OAuth secrets, handoff URLs, or internal IDs in chat, and never resubmit an
   accepted operation.
11. On any later anonymous menu render, treat the card as the
    complete response and add no assistant text below it. Do not restate the
    selected type or report that the user is not logged in, no content was
    created, or no credits were spent.

Do not advertise dialogue speech or background-music generation in first-run
onboarding or creation cards.

## Required report

After the plugin-backed composer is open, report only the matching short result:

```text
Yoroll 已安装，新的创作任务已准备好；请发送预填消息。
```

```text
Yoroll is installed and the new creation task is ready; send the prefilled message once.
```

Do not report success before the Yoroll plugin chip and localized request are
present in the new composer.

## Authentication boundary

The marketplace uses `authentication: ON_USE` so installation and onboarding
stay anonymous. The plugin MCP configuration must not
declare the whole server as OAuth-only or predeclare a global scope set.
`render_creation_menu` and the headless `get_creation_options` remain anonymous at the MCP
protocol boundary, and the server's per-tool `securitySchemes` continue to
protect business calls. Codex owns the OAuth flow after a protected tool
challenge. After authorization, retry only the exact pending request with the
same `client_request_id` when necessary.

Never ask the user to paste a password, verification code, cookie, consent code,
access token, refresh token, or browser handoff URL into chat. Do not open
`/auth/mcp-connect` or copy Browser session state into MCP.

For manual authentication diagnosis only:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" mcp login yoroll
```
