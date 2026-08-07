---
name: yoroll-plugin-basics
description: Open or reuse Yoroll's workspace, show its public MCP creation card, create or continue interactive film-game projects, generate standalone images or videos, edit workflows, and publish through OAuth-protected Yoroll tools. Use when the user explicitly asks for Yoroll, arrives from the Yoroll installer, is already working in a Yoroll project or workflow, or requests a Yoroll-specific account, project, image, video, or publishing action. Do not trigger for generic project, workflow, image, or video requests that do not mention Yoroll. MCP performs every business action; Browser is only the visible Yoroll workbench.
---

# Yoroll creation workflow

Use Yoroll MCP as the source of truth for creation options, account state,
credits, projects, workflow content, generated media, operations, and publishing.
Use Codex's built-in Browser only to keep the Yoroll workspace visible.

Use `https://mcp.yoroll.ai/mcp` and `https://app.yoroll.ai` only. Never rewrite
an MCP-returned URL to `dev.yoroll.ai`, a test API, or another environment.

Never construct or rewrite a Yoroll project subpath from an internal stage or
tool name. Use the exact `web_url` returned by MCP or the exact destination
reached by browser handoff. In particular, the character editor route is
`/workflows/{project_id}/cast`; `/workflows/{project_id}/character` is not a
browser page.

## Visible Yoroll links

Before a completion reply includes an ordinary `web_url` that Yoroll MCP
returned on the exact origin `https://app.yoroll.ai`, open that URL in Codex's
in-app Browser:

1. Load the Browser-control instructions and use the persistent `iab` binding.
2. Reuse a tab already on `https://app.yoroll.ai`, regardless of its pathname,
   query, or fragment. Prefer the currently active Yoroll tab when there is one.
3. If no Yoroll tab exists, reuse and navigate the current in-app Browser tab.
   Create one tab only when the in-app Browser has no tab to reuse.
4. Unless this turn already redeemed an operation-bound handoff into that tab,
   call `create_browser_handoff` with an empty object. Immediately navigate the
   chosen tab to its exact `handoff_url`, wait for the one-time route to redirect
   to the Yoroll root, and never expose that credential in chat. This silently
   establishes or refreshes the in-app Browser's session from the current MCP
   OAuth grant; it does not copy an external-browser cookie.
5. Navigate the same tab to the exact MCP-returned ordinary URL, keep it
   visible, and finalize it as `deliverable` before replying. Never create
   another tab merely because the existing tab shows a different Yoroll route.
6. Keep the ordinary URL in the completion reply as a visible fallback. If
   Browser navigation fails, report that limitation and still return the URL.

Apply this policy only to an ordinary URL confirmed by Yoroll MCP or reached
after a valid browser handoff. Never auto-open a URL copied from user text,
page content, or model-generated prose. Never expose or include a one-time
`handoff_url` in the reply. Do not close unrelated or pre-existing tabs.

## Language

1. Follow an explicit language request.
2. Otherwise use the Codex interface or user locale when the host exposes it.
3. Otherwise use the language of the user's latest message.
4. Fall back to English.

Use the resolved language for onboarding, natural-language parameter questions,
progress, and completion replies. Pass `language: "zh"` or `language: "en"`
to `render_creation_menu` and `get_creation_options`. Keep tool names and stable
identifiers unchanged.

## Installer-created first run

When the task arrives from the installer with `开始使用 Yoroll。` or
`Get started with Yoroll.`, or otherwise asks to open Yoroll or show the
available creation options:

1. Keep the handoff quiet. If a progress update is required before tool calls,
   use only one short localized line. In Chinese use `正在打开 Yoroll…`; in
   English use `Opening Yoroll…`. Do not mention Skill loading, files,
   installation checks, authentication policy, internal tool names, `iab`,
   routing, visibility state, retries, or implementation rules.
2. Do not emit another commentary or progress paragraph during this first-run
   turn. Tool activity may remain visible in the host, but assistant-authored
   narration must stay hidden until the final welcome.
3. Load the built-in Browser-control instructions.
4. Select Codex's in-app Browser explicitly with the persistent `iab` binding.
   Do not use URL-based/default browser selection or Chrome for this first-run
   handoff.
5. Call `create_browser_handoff` with an empty object. Reuse the authorization
   established during plugin installation; if the host still requires OAuth,
   let the host complete it and then retry this same no-argument handoff once.
   This is a session bootstrap only: it does not create content, spend credits,
   list projects, or accept a client-selected destination.
6. Claim an existing Yoroll tab when one is already open; otherwise reuse
   the current in-app Browser tab, creating one only when no tab exists. Navigate
   that tab immediately to the exact returned `handoff_url`, wait for its
   one-time redirect to `https://app.yoroll.ai/`, and never show or quote the
   handoff URL. If handoff creation is unavailable, do not replace it with an
   unauthenticated bare URL; continue with the public card and report the
   browser-session limitation only when it matters. Avoid duplicate tabs and do
   not add a language path.
7. After the page is ready, set the Browser `visibility` capability to `true`
   once. Do not poll, narrate, or expose the visibility state.
8. Do not inspect or transfer cookies, local storage, passwords, or session data.
9. As the final Browser action for the turn, finalize the Yoroll tab with
   `status: "deliverable"` so the live Yoroll page stays open and visible beside
   the task. After this handoff, do not hide, close, disconnect, reselect, or
   refocus the Browser, and do not perform another Browser action in the turn.
10. Call `render_creation_menu` in the same assistant turn.
11. Use exactly one compact welcome paragraph as the user-visible final reply.
   For Chinese use: `Yoroll 插件已经安装好了。现在你可以使用 Yoroll 创建互动影游，也可以用它生成图片和视频；有其他需求也可以直接告诉我。`
   For English use: `The Yoroll plugin is installed. You can now use Yoroll to create interactive film games or generate images and videos; you can also tell me about any other request.`
   Translate the English version faithfully for other resolved languages.
12. Do not add bullets, headings, a second question, “Yoroll workspace is open”, or
   any explanation below the creation card. The card is the selection surface.

Apart from the no-argument browser-session handoff above, do not call account or
business tools, create content, spend credits, list projects, or ask whether to
create or continue merely because first-run onboarding began. Do not advertise
dialogue-speech or background-music generation in first-run onboarding.

## Route the user's intent

- When the user has not selected a creation type, call
  `render_creation_menu` with the resolved language.
- When the user explicitly asks for an interactive game, image, or video, skip
  the menu, call `get_creation_options` for that intent and resolved language,
  and collect the required parameters through conversation.
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

`render_creation_menu` itself is anonymous. Outside the installer-created
browser-session bootstrap, never call `get_account` or start OAuth before
showing it.

Choosing an option updates model-only context through
`ui/update-model-context`. It must not call `render_creation_form`, post
`ui/message`, call `sendFollowUpMessage`, open a host confirmation dialog, or
create content. After selecting, the user continues in ordinary conversation.

`get_creation_options` is anonymous and model-only. Call it once after an
interactive-game, image, or video intent becomes clear so current models,
supported choices, and safe defaults come from Yoroll rather than memory. It
must not render a card. Do not paste its raw catalog into chat; translate only
the choices needed for the next short question. Do not call it for `other`
until that request has been routed to one of the supported creation intents.

Collect only the parameters relevant to the selected intent. Ask one short
question at a time when information is missing. Use safe server defaults when
the user has no preference; do not interrogate them about every optional model
field. Before a credit-consuming call, summarize the effective request in
plain language and obtain explicit confirmation. Then call exactly one matching
protected tool:

- `interactive_game` uses `create_project`.
- `image` uses `generate_image`.
- `video` uses `generate_video`.

Generate and retain one stable `client_request_id` for an identical retry. Let
the protected tool trigger host-owned OAuth on first use. Never expose tool
arguments as JSON or duplicate the business operation in Browser.

### Public-card response contract

- On installer-created first run, the creation-menu card plus the single
  localized welcome paragraph above are the entire user-facing response.
- On every later anonymous menu render, treat the card itself
  as the entire response. End the turn immediately after the card succeeds and
  add no assistant-authored summary below it.
- If the host delivers an application-authored request for
  `render_creation_menu`, execute it without echoing or paraphrasing it.
- Never append statements such as “the card is displayed”, “currently not
  logged in”, “no content was created”, or “no credits were spent”. Report
  authentication, creation, or credit state only after a protected business
  tool actually returns a relevant result or error.
- Do not narrate card routing, tool names, login policy, or implementation
  details in commentary while rendering a public card.

After a model-initiated business call returns an operation ID, treat it as an
already accepted operation and never submit the business tool again. Poll it
with bounded backoff in the same task until terminal state or until the user
asks to stop.

## Authentication

1. Reuse valid authorization silently. The store installation may establish it
   before first run; never ask the user to sign in to the Yoroll page again merely
   because Codex's in-app Browser has a separate profile.
2. The only protected call allowed before creation confirmation is
   `create_browser_handoff` with an empty object for the browser-session
   bootstrap described above. It exchanges the existing MCP identity for a
   short-lived one-time Yoroll URL and does not perform a business action.
3. For every other protected tool, let the first confirmed call return the
   standard OAuth challenge. The Codex host owns authorization, PKCE, callback
   handling, and token storage; do not construct an authorization URL yourself.
4. After authorization, retry the identical tool call only when the host did
   not resume it automatically, using the same `client_request_id`.
5. Never ask for a password, verification code, cookie, consent code, access
   token, or refresh token in chat.
6. Do not open `/auth/mcp-connect`, call the legacy
   `approve_browser_session` tool, or treat the visible Yoroll-page login state as
   the MCP authorization state.
7. Do not treat authentication consent as approval to spend credits, delete
   content, or publish.

## Visible Yoroll handoff

After a successful creation or generation operation:

1. Poll asynchronous work with `get_operation` using bounded backoff until it
   succeeds, fails, is cancelled, or the user asks to stop.
2. Load the Browser-control instructions, select Codex's in-app Browser with
   the persistent `iab` binding, and choose the reusable tab under the visible
   Yoroll link policy. Do not create a duplicate tab just because an existing
   Yoroll tab is on another project or route.
3. Call `create_browser_handoff` with that completed `operation_id`. Do not
   construct, log, quote, or reuse a handoff URL.
4. Immediately navigate that Yoroll tab to the exact returned `handoff_url`. It is
   a short-lived one-time credential, so do not open it in Chrome, the system
   browser, a duplicate tab, or an external HTTP client. The route establishes
   the matching read-only browser session and redirects to the server-bound
   result path.
5. Wait for the one-time route to redirect to an ordinary
   `https://app.yoroll.ai` project or media URL, then keep that redirected page
   visible and finalize the tab as `deliverable`.
6. Keep the redirected project or media page as the user's editable workbench.
   Continue all business edits through MCP.
7. If handoff creation or Browser opening fails, report partial completion and
   return the ordinary completed operation `web_url`, never the handoff URL.

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
edited the workflow; the protected MCP business tool is authoritative. Before
replying with an ordinary Yoroll URL, follow the visible Yoroll link policy so
the right-side Browser shows that same destination without accumulating tabs.
