---
name: yoroll-plugin-basics
description: Open or reuse Yoroll's DEV workspace, show its public MCP creation cards, create or continue interactive film-game projects, generate standalone images or videos, edit workflows, and publish through OAuth-protected Yoroll tools. Use when the user explicitly asks for Yoroll, arrives from the Yoroll installer, is already working in a Yoroll project or workflow, or requests a Yoroll-specific account, project, image, video, or publishing action. Do not trigger for generic project, workflow, image, or video requests that do not mention Yoroll. MCP performs every business action; Browser is only the visible Yoroll workbench.
---

# Yoroll creation workflow

Use Yoroll MCP as the source of truth for creation options, account state,
credits, projects, workflow content, generated media, operations, and publishing.
Use Codex's built-in Browser only to keep the Yoroll DEV workspace visible.

Never rewrite an MCP-returned URL to `app.yoroll.ai`, `api.lineargame.ai`, or a
production origin. Use `https://mcp.yoroll.ai/mcp` and
`https://dev.yoroll.ai` only.

## Language

1. Follow an explicit language request.
2. Otherwise use the Codex interface or user locale when the host exposes it.
3. Otherwise use the language of the user's latest message.
4. Fall back to English.

Use the resolved language for onboarding, questions, progress, and completion
replies. Keep tool names and stable identifiers unchanged. Pass `language: "zh"`
to `render_creation_form` for Chinese and `language: "en"` for English or other
languages supported only through the English fallback.

## Installer-created first run

When the task arrives from the installer with `开始使用 Yoroll。` or
`Get started with Yoroll.`, or otherwise asks to open Yoroll or show the
available creation options:

1. Keep the handoff quiet. If a progress update is required before tool calls,
   use only one short localized line. In Chinese use `正在打开 Yoroll…`; in
   English use `Opening Yoroll…`. Do not mention Skill loading, files,
   installation checks, authentication policy, internal tool names, `iab`, DEV
   routing, visibility state, retries, or implementation rules.
2. Do not emit another commentary or progress paragraph during this first-run
   turn. Tool activity may remain visible in the host, but assistant-authored
   narration must stay hidden until the final welcome.
3. Load the built-in Browser-control instructions.
4. Select Codex's in-app Browser explicitly with the persistent `iab` binding.
   Do not use URL-based/default browser selection or Chrome for this first-run
   handoff.
5. Claim an existing Yoroll DEV tab when one is already open; otherwise create
   one tab and navigate it to the exact entry URL `https://dev.yoroll.ai`.
   Avoid duplicate tabs and do not add a language path.
6. After the page is ready, set the Browser `visibility` capability to `true`
   once. Do not poll, narrate, or expose the visibility state.
7. Do not inspect or transfer cookies, local storage, passwords, or session data.
8. As the final Browser action for the turn, finalize the Yoroll tab with
   `status: "deliverable"` so the live DEV page stays open and visible beside
   the task. After this handoff, do not hide, close, disconnect, reselect, or
   refocus the Browser, and do not perform another Browser action in the turn.
9. Call `render_creation_menu` in the same assistant turn.
10. Use exactly one compact welcome paragraph as the user-visible final reply.
   For Chinese use: `Yoroll 插件已经安装好了。现在你可以使用 Yoroll 创建互动影游，也可以用它生成图片和视频；有其他需求也可以直接告诉我。`
   For English use: `The Yoroll plugin is installed. You can now use Yoroll to create interactive film games or generate images and videos; you can also tell me about any other request.`
   Translate the English version faithfully for other resolved languages.
11. Do not add bullets, headings, a second question, “DEV workspace is open”, or
   any explanation below the creation card. The card is the selection surface.

Do not authenticate, create content, spend credits, list projects, or ask whether
to create or continue merely because first-run onboarding began. Do not advertise
dialogue-speech or background-music generation in this preview.

## Route the user's intent

- When the user has not selected a creation type, call
  `render_creation_menu`.
- When the user explicitly asks for an interactive game, image, or video, skip
  the menu and call `render_creation_form` with `interactive_game`, `image`, or
  `video` plus the resolved `language`.
- Treat create, new, first, make, and their equivalents as new-project intent.
  Never ask “new or existing?” after that intent is already clear.
- Treat continue, resume, open, existing, and their equivalents as
  existing-project intent. Authenticate only when the focused project read is
  called, then list or open projects as needed.
- Keep the menu's “other” choice in conversation. Ask one short clarifying
  question and route the answer to an existing focused Yoroll tool; never invent
  a generic submit endpoint.
- Do not advertise or proactively select dialogue-speech or background-music
  tools. They are outside this plugin's first-run experience.

## Creation cards

`render_creation_menu` and `render_creation_form` are anonymous. Never call
`get_account` or start OAuth before showing either card.

Choosing `interactive_game`, `image`, or `video` in the menu, and returning from
the settings form to the menu, are navigation rather than new conversational
requests. The components must call
`render_creation_form` directly through the app-to-MCP tool bridge or switch to
the other view inside the same widget. They must not call
`sendFollowUpMessage`, ask the host to post a user-authored prompt, open a host
confirmation dialog, or create content merely because the user navigated. The
`other` choice may remain a conversation handoff because it requires free-form
clarification.

The detailed card is the review-and-submit surface:

- `interactive_game` submits to `create_project`.
- `image` submits to `generate_image`.
- `video` submits to `generate_video`.

Let the existing protected business tool enforce OAuth, credits, idempotency,
and validation. Do not duplicate the business operation in Browser or another
HTTP call.

On submit, the component calls the protected business tool directly. It must
not preflight with `get_account`. Keep the call inside the silent MCP Apps
`tools/call` bridge. If Codex Mac returns the standard OAuth challenge without
opening it, show a connection link to the portable installed Plugins surface at
`codex://skills`, preserve the full pending request and stable
`client_request_id` in private widget state, and retry when the user returns
after following the link, selecting Yoroll, and completing Authenticate. Never
enqueue `ui/message`, call
`sendFollowUpMessage`, expose the arguments as JSON or tool instructions, or
ask the user to type a connection prompt.

### Public-card response contract

- On installer-created first run, the creation-menu card plus the single
  localized welcome paragraph above are the entire user-facing response.
- On every later anonymous menu or detailed-form render, treat the card itself
  as the entire response. End the turn immediately after the card succeeds and
  add no assistant-authored summary below it.
- If the host delivers an application-authored routing request for
  `render_creation_menu` or `render_creation_form`, execute the requested public
  render without echoing, paraphrasing, or explaining that request.
- Never append statements such as “the card is displayed”, “currently not
  logged in”, “no content was created”, or “no credits were spent”. Report
  authentication, creation, or credit state only after a protected business
  tool actually returns a relevant result or error.
- Do not narrate card routing, tool names, login policy, or implementation
  details in commentary while rendering a public card.

After a component-initiated business call returns an operation ID, treat it as
an already accepted operation and never submit the business tool again. Do not
manufacture another conversation turn from the component. On a later explicit
user request to continue or check status, call `get_operation` with that ID (or
recover the operation from `list_operations`) and open its returned `web_url`
after success.

## Authentication

1. Start the Yoroll connection flow only when the first protected tool returns
   its standard authentication challenge. The current Codex Mac fallback opens
   a connection link to the installed Plugins page, where the user selects
   Yoroll; the host still owns OAuth itself.
2. Reuse a valid authorization silently. Do not force a login check before an
   anonymous card.
3. Let the same card submission carry the OAuth challenge through the silent
   MCP Apps bridge. Keep the full pending request and stable `client_request_id`
   in private widget state so returning from Authenticate or a deliberate retry
   does not create a duplicate operation. Do not echo the arguments, ask the
   user to choose again, or ask them to type a connection prompt.
4. Never ask for a password, verification code, cookie, consent code, access
   token, or refresh token in chat.
5. Do not open `/auth/mcp-connect`, call the legacy
   `approve_browser_session` tool, or treat the visible DEV-page login state as
   the MCP authorization state.
6. Do not treat authentication consent as approval to spend credits, delete
   content, or publish.

## Visible DEV handoff

After a successful creation or generation operation:

1. Poll asynchronous work with `get_operation` using bounded backoff until it
   succeeds, fails, is cancelled, or the user asks to stop.
2. Use only the exact `web_url` returned by the completed MCP result.
3. Open that URL in the existing Yoroll DEV tab for a newly created interactive
   game, image, or video unless the user explicitly asks not to open it.
4. Keep the resulting project or media page visible as the user's editable
   workbench. Continue all business edits through MCP.
5. If MCP succeeds but Browser opening fails, report partial completion and
   return the exact `web_url`; do not claim that the visible handoff succeeded.

Do not click, type, drag, submit, or use DOM automation to edit Yoroll project
content. Browser display and MCP business state have different responsibilities.

## Projects and workflow editing

1. Read only the needed workflow domain. Prefer `get_story`, `get_characters`,
   `get_plot_outline`, or `get_scenes` over loading unrelated state.
2. Create a project only after clear Yoroll new-project intent. Use the user's
   own words as the idea; do not replace a short premise with an invented design
   document.
3. Use focused MCP writes and a stable caller-generated `client_request_id`.
   Reuse it only for an identical retry.
4. Before a short authoring mutation, read the current workflow `revision` and
   pass it as `expected_revision` when the selected tool supports it.
5. For long-running generation tools that accept `expected_updated_at`, treat
   it only as a pre-dispatch stale-state check, not a lock or compare-and-swap
   guarantee.
6. On a revision or timestamp conflict, re-read the affected workflow and
   reconcile the user's intended change before retrying.
7. Use only IDs returned by MCP. Do not guess project, scene, asset, operation,
   or media identifiers.

## Standalone image and video

- `generate_image` and `generate_video` do not require a project ID. Do not
  invent or request one.
- Prefer a durable `media_asset_id` over a temporary provider URL for later
  references.
- Attach or select generated media inside a workflow only when the user asks and
  only through the focused project tool.

## Confirmation and publishing

Ask for confirmation immediately before spending credits when the user has not
already approved the quoted action, deleting content, or publishing.

Run `validate_publish` immediately before `publish_project`, report its blockers,
and pass the returned `workflow_updated_at` as the optional
`expected_updated_at` stale-state precondition. Use `get_publish_status` for
later refreshes.

## Completion reporting

Report only tool-confirmed facts. Include the human-facing project or media
result, terminal operation state, credits charged when returned, and the
ordinary `web_url` only when MCP actually returned it. Include internal IDs only
when requested or needed for recovery. Never claim that a card or Browser action
edited the workflow; the protected MCP business tool is authoritative.
