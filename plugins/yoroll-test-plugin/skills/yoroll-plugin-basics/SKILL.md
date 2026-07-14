---
name: yoroll-plugin-basics
description: Open, focus, navigate, and assist with Yoroll in Codex's built-in browser, including secure sign-in and browser-based interactive game workflows. Use when the user asks to open or visit Yoroll, sign in, learn what Yoroll can do, start or continue a Yoroll Workflow, create an interactive game, or operate the visible Yoroll website. This preview skill uses browser control and does not provide Yoroll MCP tools.
---

# Yoroll Plugin Basics

Use this skill as the onboarding and browser-operation layer for Yoroll.

## Match the user's language

1. Follow an explicit language request from the user.
2. Otherwise use the Codex interface or user locale when the host exposes it.
3. Otherwise use the language of the user's current conversation, favoring the latest user message when the conversation is mixed.
4. Fall back to English only when no language can be inferred.

Use the resolved language for progress updates, capability explanations, questions, and final replies. Do not switch languages merely because the Yoroll page uses another locale. Keep plugin names, product names, and technical identifiers unchanged.

## Open Yoroll

1. Load the host's built-in browser-control instructions and discover the current in-app browser tools. Do not assume browser control is unavailable only because its tools are not initially visible.
2. For a generic open or first-run request, use the exact entry URL `https://app.yoroll.ai`. Do not add a trailing slash or a language path such as `/zh` to the URL passed to the browser.
3. Reuse an existing `app.yoroll.ai` tab when possible. For a generic open or first run, navigate that tab to the exact entry URL above and let Yoroll resolve its own default locale. Avoid duplicate tabs.
4. Preserve an exact project or Workflow URL only when the user explicitly provides it or clearly asks to continue that existing work.
5. When the browser reports that it opened or focused Yoroll successfully, treat the handoff as complete. Do not poll repeatedly unless the requested task requires visible verification.
6. Keep the right-side Yoroll page available as the user's live workbench while continuing the conversation.

## Handle sign-in

- After opening Yoroll, inspect the visible page once. If the user is clearly signed out and a `Log in` or equivalent sign-in button is visible, click it once so the login flow is ready.
- Ask the user to complete credentials, verification, or consent in the visible browser. Continue after the user confirms or the visible page shows success.
- If no sign-in control is visible and the requested work does not require authentication yet, continue without blocking the user.
- Never ask the user to paste a password, verification code, session cookie, or token into chat.
- Do not inspect cookies, local storage, saved passwords, or session data.

## Start the first workflow conversation

When the user arrives from the installer prompt or asks what Yoroll can do:

1. Open Yoroll and prepare the login flow before explaining anything.
2. Do not narrate browser setup. Use at most one short progress update only when the host requires it.
3. After the page is ready, use the welcome structure below: confirm the Workflow is open with its link, list three capability groups, ask the two numbered questions, and close with the editable-workflow reminder.
4. Do not claim that a project was created unless the visible website or a future Yoroll tool confirms it.
5. Do not mention installation mechanics, browser routing, preview status, MCP, limitations, or safety rules in the welcome unless the user asks or a limitation actually blocks the requested action.
6. Do not choose a game concept, answer the onboarding questions on the user's behalf, draft a sample game, write a game brief, or generate a prompt for the user to paste into Yoroll. After the welcome and questions, stop and wait for the user's reply.

Preferred Chinese welcome after the page is ready:

```text
Yoroll Workflow 已经打开：[进入 Yoroll Workflow](https://app.yoroll.ai)。

我可以协助完成：

- 剧情创作：从一个想法开始，完善世界观、角色、故事线、对白与分支剧情。
- 场景与互动：制作场景、分镜、互动选择、玩法流程和网页中提供的其他游戏内容。
- 素材与成品：根据文字或参考素材生成图片、视频、角色、音乐、音效等素材，并继续预览和完善游戏。

现在告诉我两件事即可：

1. 你想制作什么样的互动游戏？题材、玩法、画面风格都可以简单描述。
2. 你手上有什么素材？例如故事想法、角色设定、图片、视频、音频或参考游戏。

我会根据你的需求一步步开始制作。过程中你也可以随时进入 Yoroll Workflow 界面，亲自调整故事、场景、互动内容及其他任何内容。
```

If login is waiting, use this instead:

```text
Yoroll Workflow 已经打开：[进入 Yoroll Workflow](https://app.yoroll.ai)。请先在右侧完成登录，登录后我们就可以开始制作你的互动游戏。
```

Translate these naturally into the resolved user language rather than adding more detail.

## Operate the visible website

- Use the built-in browser for navigation and reversible actions the user requests.
- Inspect current visible or interactive page state immediately before acting. Do not rely on guessed selectors, routes, project IDs, or stale page state.
- Keep actions within Yoroll while this skill is active.
- Ask for confirmation immediately before publishing a game, spending credits, starting paid generation, deleting work, or performing another consequential action.
- After an action, verify the visible result in proportion to its risk and report only what the page confirms.
- If browser control cannot perform an action, state the exact limitation briefly and leave the relevant Yoroll page open for the user to finish manually.
- Never respond to a browser failure by generating a substitute prompt, game specification, code block, or other content for the user to copy and paste into Yoroll. Do not invent a workaround task on the user's behalf.

## Respect preview boundaries

- Do not claim that Yoroll MCP tools are installed or available.
- Do not promise end-to-end Workflow automation that the current browser-only plugin cannot verify.
- If the built-in browser is unavailable, provide the direct Yoroll link instead of pretending the page was opened.
