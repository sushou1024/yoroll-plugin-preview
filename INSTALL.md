# Install the Yoroll MCP Developer Preview

This is an agent-executable installer for Codex desktop. Read the complete file,
perform the steps, and keep the installation task quiet. Do not stop after
printing commands.

## Completion contract

Installation is complete only when all of the following are true:

1. The `ennio-yoroll-preview` marketplace is configured from the exact local
   workspace `/Users/ennio/xxx/yoroll-plugin`.
2. `yoroll-test-plugin@ennio-yoroll-preview` is installed and enabled.
3. Yoroll MCP is enabled at `https://mcp.yoroll.ai/mcp`.
4. A new task is created in the same Codex project or workspace, seeded with the
   localized first-run request, titled, and opened for the user.

Do not authenticate, call Yoroll MCP, open Yoroll, create content, or spend
credits inside the installation task. The installed Skill owns first-run
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

## Local source

Use this local marketplace root and no other source:

```text
/Users/ennio/xxx/yoroll-plugin
```

## Install or update

Inspect the configured marketplaces first:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" plugin marketplace list --json
```

If `ennio-yoroll-preview` is already configured from the exact local workspace,
reuse it. If that name points somewhere else, remove the installed Yoroll plugin
when present, remove only that marketplace entry, and then add the local root.
Do not remove or rewrite unrelated marketplaces.

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" plugin marketplace add \
  /Users/ennio/xxx/yoroll-plugin
```

Install or refresh the plugin from that local marketplace:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" plugin add \
  yoroll-test-plugin@ennio-yoroll-preview
```

Verify it with:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" plugin list --json
"/Applications/ChatGPT.app/Contents/Resources/codex" mcp get yoroll
```

The plugin must be installed and enabled with both `source.path` and
`marketplaceSource.source` resolving under `/Users/ennio/xxx/yoroll-plugin`.
Yoroll MCP must be enabled with Streamable HTTP at
`https://mcp.yoroll.ai/mcp`. It may correctly report `Not logged in`;
authentication is intentionally deferred until first protected use.

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
开始使用 Yoroll。
```

### English

Title:

```text
Create with Yoroll
```

Initial message:

```text
Get started with Yoroll.
```

## Create and open the Yoroll task

The newly installed plugin is not loaded into the installation task. A new task
is mandatory.

1. Discover task-management capabilities equivalent to `create_thread`,
   `send_message_to_thread`, `list_threads`, `set_thread_title`, and
   `navigate_to_codex_page`.
2. Preserve the installation task's current Codex project or workspace. Create
   a projectless task only when the installation task is projectless.
3. Prefer creating the task with the localized initial message in one call.
   Otherwise create it and immediately send the message. An empty task is a
   failure.
4. Wait until the task is registered, then set the localized title. If title
   propagation races creation, refresh the task list and retry.
5. Open the new task for the user.

Use a manual fallback only when task creation, message delivery, project-context
preservation, title setting, or navigation is genuinely unavailable or returns
an error. In that case, identify the failed capability and provide the localized
initial message for the user to paste into a new task.

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
4. If the initial user request already names
   interactive game, image, or video, skip the menu and show that settings card.
5. When the user chooses interactive game, image, or video in the menu, or
   returns from settings to the menu, switch views silently with a direct
   app-to-MCP tool call or same-widget state transition. Do not send a follow-up
   prompt or open a host confirmation dialog for either navigation step.
6. Start OAuth only when the user submits a protected creation or later requests
   another protected business action.
7. Keep every business action in MCP. Browser is a visible workbench, not an
   automation fallback.
8. After a successful project, image, or video operation returns a `web_url`,
   open that exact DEV URL in the existing Yoroll tab.
9. Require the settings card to send a follow-up message after its protected
   `callTool` returns an operation ID. That follow-up starts the model turn that
   polls `get_operation`; a component result alone is not a tracking loop.
10. On any later anonymous menu or detailed-form render, treat the card as the
    complete response and add no assistant text below it. Do not restate the
    selected type or report that the user is not logged in, no content was
    created, or no credits were spent.

Do not advertise dialogue speech or background-music generation in first-run
onboarding or creation cards.

## Required report

After the new task is open, report only the matching short result:

```text
Yoroll 已安装，并已打开新的创作任务。
```

```text
Yoroll is installed and the new creation task is open.
```

Do not report success before the task is seeded and open.

## Authentication boundary

The marketplace uses `authentication: ON_USE`. `render_creation_menu` and
`render_creation_form` must remain anonymous. Let Codex handle Yoroll OAuth only
when the first protected tool returns its standard authentication challenge.

Never ask the user to paste a password, verification code, cookie, consent code,
access token, or refresh token into chat. Do not open `/auth/mcp-connect`, request
the legacy `web:session` scope, or copy Browser session state into MCP.

For manual authentication diagnosis only:

```bash
"/Applications/ChatGPT.app/Contents/Resources/codex" mcp login yoroll
```
