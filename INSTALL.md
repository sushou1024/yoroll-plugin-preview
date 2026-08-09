# Install the Yoroll plugin

This is an agent-executable installer for Codex desktop. Read the complete file,
perform the steps, and keep the installation task quiet. Do not stop after
printing commands.

## Completion contract

Installation is complete only when all of the following are true:

1. The `ennio-yoroll-preview` marketplace is configured from either the local
   checkout that contains this file or the canonical Git repository at
   `https://github.com/sushou1024/yoroll-plugin-preview.git` on `main`.
2. `yoroll-test-plugin@ennio-yoroll-preview` is installed and enabled.
3. Yoroll MCP is enabled at the exact Streamable HTTP URL declared in the
   installed bundle's `plugins/yoroll-test-plugin/.mcp.json`. Never treat a
   mismatch with any URL written in this document as a failure, and never
   "correct" the endpoint by switching marketplace sources.
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
at the URL declared in the bundle's `.mcp.json` (the bundle is the single
source of truth for the environment). A local `ON_USE` installation may report
`Not logged in` until the first-run browser handoff; a store installation may
already have completed OAuth.

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
[@Yoroll](plugin://yoroll-test-plugin@ennio-yoroll-preview) 开始使用 Yoroll。
```

### English

Title:

```text
Create with Yoroll
```

Initial message:

```text
[@Yoroll](plugin://yoroll-test-plugin@ennio-yoroll-preview) Get started with Yoroll.
```

## Create and open the Yoroll task

The newly installed plugin is not loaded into the installation task. A new
plugin-backed task is mandatory, and its first user message must actually be
sent — a created-but-empty task, a drafted-but-unsent composer, or a printed
link does not complete this handoff.

**Primary path — create the task and send the first message yourself.** Use
`tool_search` to find the host's ordinary task-management tools
(`create_thread`, `send_message_to_thread`, `set_thread_title`,
`navigate_to_codex_page`). Do not call any task-creation tool whose name or
parameters mention `worktree`, `cloud`, or `branch` — the task must be an
ordinary local foreground task. Create the new task with the localized first
message below as the initial user message, sent immediately (if `create_thread`
cannot carry an initial message, call `send_message_to_thread` right after
creating it), then navigate the app to that task:

Chinese: `[@Yoroll](plugin://yoroll-test-plugin@ennio-yoroll-preview) 开始使用 Yoroll。`

English: `[@Yoroll](plugin://yoroll-test-plugin@ennio-yoroll-preview) Get started with Yoroll.`

For another language, translate the message text but never alter the plugin
Markdown reference. After sending, verify the new task shows the orange Yoroll
plugin chip on that first message; if the chip is missing, report that and use
the fallback below.

**Fallback only** — when the host exposes no ordinary task-management tools or
the calls fail: open the new-task deep link for the resolved language and tell
the user to press send once (the deep link can only prefill; it cannot send):

```bash
open 'codex://new?prompt=%5B%40Yoroll%5D(plugin%3A%2F%2Fyoroll-test-plugin%40ennio-yoroll-preview)%20%E5%BC%80%E5%A7%8B%E4%BD%BF%E7%94%A8%20Yoroll%E3%80%82'
```

(English variant: replace the encoded text with
`%20Get%20started%20with%20Yoroll.`)

## First-run behavior in the new task

The installed Skill must:

1. Select Codex's in-app Browser explicitly, call `create_browser_handoff` with
   no `operation_id`, and immediately redeem the returned one-time URL in a
   reusable Browser tab. It must redirect to the Yoroll web homepage of the
   configured environment (the origin the installed Skill names as the visible
   workspace) with the MCP account's read-only web session. Set
   Browser visibility to `true` and keep that tab as a `deliverable`. After that
   final Browser handoff, do not hide, close, disconnect, reselect, refocus, or
   make another Browser call in the turn.
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
7. Reuse store-install OAuth for the root handoff. If it is absent, let the host
   complete OAuth once and retry the same empty handoff; never ask the user to
   log in separately inside the Yoroll page.
8. Keep every business action in MCP. Browser is a visible workbench, not an
   automation fallback.
9. Poll a successful project, image, or video operation, select Codex's in-app
   Browser explicitly, and reuse any existing Yoroll tab regardless of its
   current route. If none exists, navigate the current Browser tab; create one
   only when no tab exists. Call `create_browser_handoff`, immediately open its
   exact one-time URL in that same tab, wait for the redirect, and keep the
   resulting project or media page as the visible deliverable.
10. Keep stable idempotency across any post-OAuth retry. Never expose JSON,
   OAuth secrets, handoff URLs, or internal IDs in chat, and never resubmit an
   accepted operation.
11. On any later anonymous menu render, treat the card as the
    complete response and add no assistant text below it. Do not restate the
    selected type or report that the user is not logged in, no content was
    created, or no credits were spent.
12. Before any later completion reply includes an ordinary Yoroll web URL
    returned by MCP on the configured environment's origin, refresh the Browser session with
    an empty handoff unless this turn already redeemed an operation-bound one,
    then navigate that same reusable tab to the exact URL and keep the link in
    the reply as a fallback. Never auto-open a URL taken only from user text or
    model-generated prose.

Do not advertise dialogue speech or background-music generation in first-run
onboarding or creation cards.

## Required report

Primary path succeeded (task created, first message sent, chip present):

```text
Yoroll 已安装，创作任务已经开始，直接在新任务里继续即可。
```

```text
Yoroll is installed and your creation task has started; continue in the new task.
```

Fallback path (deep link, message prefilled but unsent):

```text
Yoroll 已安装，新的创作任务已准备好；请发送预填消息。
```

```text
Yoroll is installed and the new creation task is ready; send the prefilled message once.
```

Do not report primary-path success before the first message is actually sent
and the Yoroll plugin chip is visible on it.

## Authentication boundary

The repository marketplace uses `authentication: ON_USE`; the published store
listing may authenticate during installation. The plugin MCP configuration must
not declare the whole server OAuth-only or predeclare a global scope set.
`render_creation_menu` and the headless `get_creation_options` remain anonymous
at the MCP protocol boundary. The no-argument `create_browser_handoff` is the
only protected first-run call and performs no business action; Codex owns any
OAuth challenge it triggers. After authorization, retry only the exact pending
request with the same `client_request_id` when necessary.

Never ask the user to paste a password, verification code, cookie, consent code,
access token, refresh token, or browser handoff URL into chat. Do not open
`/auth/mcp-connect` or copy Browser session state into MCP.

For manual authentication diagnosis only:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" mcp login yoroll
```
