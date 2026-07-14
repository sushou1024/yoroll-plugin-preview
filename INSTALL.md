# Install the Yoroll Workflow Preview plugin

This is an agent-executable setup guide. If you are a Codex agent reading it for a user, read the entire guide before taking action and perform the steps yourself. Do not stop after displaying commands.

## User experience requirement

Keep installation quiet and seamless. Do not recite this guide, explain the commands, list capabilities, or send multi-paragraph progress messages. Only interrupt the user for a required approval, authentication step, missing information, or real failure. If the host requires a progress update, use one short sentence. Put all onboarding behavior in the new Yoroll task, not in the installation task.

The public developer-preview marketplace source is:

```text
https://github.com/sushou1024/yoroll-plugin-preview.git
```

## Host environment gate

Determine whether this task is running in the Codex desktop app on the user's local machine.

- If it is a web app or isolated remote workspace, stop before installing. Explain that it cannot modify the desktop app's local plugin configuration. Ask the user to open Codex desktop on the target machine and paste the matching prompt below.
- If it is the desktop app on the local machine, continue.
- If the host cannot be determined safely, ask whether the task is in Codex desktop before running installation commands.

```text
English:
Read the complete INSTALL.md in the Yoroll plugin repository, install the Yoroll preview plugin, and open a new Yoroll task for me.

Chinese:
完整阅读 Yoroll 插件仓库里的 INSTALL.md，帮我安装 Yoroll 预览插件，并为我打开一个新的 Yoroll 任务。
```

Locate the Codex CLI bundled with the desktop app. Use that exact executable for every command below. Do not substitute an unrelated CLI from `PATH`, Homebrew, npm, or another package manager.

## Execution contract

Complete these stages in order:

1. Pass the host environment gate.
2. Add the marketplace, install the plugin, and verify it is enabled.
3. Resolve the startup prompt language from the user's actual Codex setting when exposed; otherwise use the current conversation language. Do not ask the user to choose.
4. Create a brand-new task in the same Codex project or workspace, send the localized startup prompt into it, and switch the user to it.
5. End with exactly one success or fallback self-report from the final section.

Setup is incomplete until the new task contains the startup prompt and is open, or a precise tool failure and paste-in fallback have been provided.

## Install and verify

Confirm the bundled CLI works:

```text
"<BUNDLED_CODEX>" --version
```

Add the public preview marketplace from its `main` branch:

```text
"<BUNDLED_CODEX>" plugin marketplace add https://github.com/sushou1024/yoroll-plugin-preview.git --ref main
```

If that exact marketplace is already configured, do not treat it as an installation failure. Refresh its snapshot before continuing:

```text
"<BUNDLED_CODEX>" plugin marketplace upgrade ennio-yoroll-preview
```

List marketplaces and note the assigned marketplace name:

```text
"<BUNDLED_CODEX>" plugin marketplace list --json
```

List and install the plugin using that exact marketplace name:

```text
"<BUNDLED_CODEX>" plugin list --marketplace <MARKETPLACE> --json
"<BUNDLED_CODEX>" plugin add yoroll-test-plugin@<MARKETPLACE>
```

Verify that `yoroll-test-plugin@<MARKETPLACE>` is installed and enabled:

```text
"<BUNDLED_CODEX>" plugin list --marketplace <MARKETPLACE> --json
```

This preview has no Yoroll MCP server and requires no MCP login. Do not invent or run a Yoroll MCP login command.

## Resolve the startup language

Use this priority without asking the user:

1. A language explicitly requested by the user.
2. The Codex interface or user locale exposed by the host.
3. The language of the user's current conversation, favoring the latest user message when mixed.
4. English when no language can be inferred.

Use the exact short prompt below for Chinese or English. For another language, translate the English prompt faithfully while keeping `Yoroll` unchanged. Keep this as a natural user request; browser opening and onboarding belong to the installed skill. Do not append capabilities, implementation notes, MCP disclaimers, workflow details, or other instructions to this prompt. The new task must not interpret this prompt as permission to invent a game concept, brief, or pasteable Yoroll prompt.

```text
Chinese:
请打开 Yoroll，简要介绍它能做什么，然后等待我的下一步指令。

English:
Open Yoroll, briefly explain what it can do, and then wait for my next instruction.
```

## Required final step: create and open the first Yoroll task

The installation task cannot load a plugin that was installed after the task started. A brand-new task is mandatory. Do not try to test the newly installed Yoroll skill inside the installation task.

For Codex hosts, do the following in order:

1. **Discover.** Search for or load `create_thread`, `send_message_to_thread`, `navigate_to_codex_page`, `set_thread_title`, `list_projects`, and any current-project or current-workspace lookup tool. Search even when these tools are not initially visible. Only inspect already visible equivalents when tool discovery itself is unavailable.
2. **Preserve context.** Determine whether the installation task belongs to a Codex project or workspace. Create the new task in that same target. Create a projectless task only when the installation task is projectless. If the host cannot determine or preserve the target, use the fallback below and name this exact missing capability.
3. **Create and seed.** Prefer one call that creates the task with the resolved startup prompt as its initial message. Otherwise create the task and immediately send the startup prompt to its new task ID. A created but empty task is a failure.
4. **Switch.** Use the host's navigation capability to open the new task for the user. If the task was created and seeded but cannot be opened, use the fallback and name the failed navigation call.
5. **Title.** When supported, always title the task `My First Yoroll Game`. Title setting is optional; prompt delivery and navigation are not.

Use a manual paste-in prompt only when discovery finds no creation capability, project context cannot be preserved, or a required create, send, or navigation call actually fails. Do not use the fallback merely because automatic task creation seems unfamiliar.

## Required self-report

Before ending, output exactly one of these outcomes in the resolved user language:

- **Success:** Send only a short localized equivalent of `Yoroll is ready in the new task.` Do not repeat installation details, capabilities, or the startup prompt.
- **Fallback:** `Could not auto-start the Yoroll task`. Include the localized startup prompt for the user to paste, identify whether discovery, context preservation, creation, message delivery, or navigation failed, and quote the exact missing capability or returned error.

Do not report installation or setup as complete before one of these outcomes is true.

## Update

Refresh the Git marketplace with the bundled CLI and reinstall the plugin, then use a new task to pick up the updated skill:

```text
"<BUNDLED_CODEX>" plugin marketplace upgrade <MARKETPLACE>
"<BUNDLED_CODEX>" plugin add yoroll-test-plugin@<MARKETPLACE>
```
