---
name: yoroll-plugin-basics
description: Create, inspect, and edit Yoroll projects with the authenticated Yoroll MCP server; generate standalone images, videos, dialogue speech, and background music; publish projects; and pair Codex's built-in browser without a second login. Use when the user explicitly asks for Yoroll, is already working in a Yoroll project or workflow, or requests a Yoroll-specific account, media, publishing, or authenticated Browser action. Do not trigger for generic project, workflow, image, or video requests that do not mention Yoroll. MCP performs every business edit; the Browser is read-only.
---

# Yoroll MCP workflows

Use Yoroll MCP as the source of truth for account state, credits, projects, workflow content, generated media, operations, publishing, and Browser-session approval. Use Codex's built-in Browser only to display the authenticated test-environment web UI.

Never rewrite an MCP-returned URL to `app.yoroll.ai`, `api.lineargame.ai`, or another production origin. This preview uses `https://mcp.yoroll.ai/mcp` and `https://dev.yoroll.ai` only.

## Language

Follow the user's explicit language. Otherwise use the language of the latest user message. Keep tool names and stable identifiers unchanged.

## Authentication

1. Let the host complete Yoroll MCP OAuth and the single consent bundle. Never ask for a password, verification code, cookie, OAuth token, or refresh token in chat.
2. Use `get_account` when an authenticated operation needs a login check. Do not infer MCP authentication from the visible Browser page.
3. If MCP OAuth is unavailable, explain that the Yoroll connection must be completed. Do not fall back to Browser clicking for workflow changes.

## Pair the Browser without another login

Perform this sequence only when an authenticated web surface is needed:

1. Call `get_account` to verify that the Yoroll MCP connection is authenticated.
2. Load the installed Browser-control instructions.
3. Open or reuse a Yoroll tab at the exact fixed URL `https://dev.yoroll.ai/auth/mcp-connect`. Do not modify this URL.
4. Wait for the page to create a pairing and read `pairing_code` from the machine-readable DOM element. The current page exposes it as `#yoroll-mcp-pairing-code` with `data-pairing-code`.
5. Pass that value directly and only to the Yoroll MCP call `approve_browser_session({pairing_code})`.
6. A same-account retry may idempotently return `approved`. If approval reports a cross-account conflict or a claimed/terminal pairing, stop the attempt. Do not continue to a business page and do not fall back to an older Browser account. Require a freshly generated pairing before continuing.
7. After a clean approval, wait for the same page to poll, claim the approved server session, and navigate into Yoroll. Treat only that server-established session as authenticated; never restore or trust a previous Browser identity as a fallback.
8. Navigate separately to the ordinary project or image/video `web_url` returned by the relevant business tool, or to `https://dev.yoroll.ai` for a generic Yoroll page request.

The pairing code is a short-lived, low-authority nonce, not a project ID, media ID, route, redirect, credential that can claim a session by itself, or other business target. It may pass only through Codex's internal Yoroll Browser-DOM-to-Yoroll-MCP step. Never ask the user to copy, paste, read, or relay it; never quote it in user-visible chat, put it in a URL, send it to another tool, or log it. Do not add a project or media target to `approve_browser_session`. If it expires or approval fails, reload the fixed connect page and use its new code; do not reuse the old code.

## Browser boundary

- Reuse the existing `dev.yoroll.ai` tab and avoid duplicate tabs.
- Treat the Browser as read-only even while MCP edits the same project. Do not click, type, drag, submit, or use DOM automation to change story, characters, plot, scenes, generation settings, asset versions, project state, or publishing state.
- Never inspect cookies, local storage, saved passwords, or session data.
- Open a project or media page only when the user asks to view it or visual inspection materially helps.
- If Browser control is unavailable, continue MCP work and return any ordinary tool-provided `web_url`. Browser availability must not block project or media operations.

## Tool surface: 40 business tools plus pairing

| Area | Tools |
| --- | --- |
| Account (2) | `get_account`, `get_credit_balance` |
| Project reads (7) | `list_projects`, `get_project_status`, `get_project`, `get_story`, `get_characters`, `get_plot_outline`, `get_scenes` |
| Project writes (19) | `create_project`, `update_project_title`, `update_generation_config`, `update_ui_config`, `update_story`, `add_character`, `update_character`, `remove_character`, `add_scene`, `update_scene`, `remove_scene`, `reorder_scene`, `generate_plot`, `generate_characters`, `generate_character_images`, `generate_scene_images`, `generate_scene_videos`, `generate_ui`, `select_asset_version` |
| Publishing (3) | `get_publish_status`, `validate_publish`, `publish_project` |
| Standalone media and library (6) | `generate_image`, `generate_video`, `synthesize_dialogue`, `generate_bgm`, `list_media_assets`, `get_media_asset` |
| Operations (3) | `get_operation`, `list_operations`, `cancel_operation` |
| Browser pairing (+1) | `approve_browser_session` |

Use focused tools instead of inventing a generic HTTP or Browser fallback.

## Account and credits

- Use `get_account` for the signed-in profile and login state.
- Use `get_credit_balance` before a credit-consuming request when the cost or ability to proceed is unclear.
- When a tool provides an estimate or quote, tell the user the expected cost before starting paid generation.

## Projects and workflow editing

1. Use project read tools to understand only the needed domain. Prefer `get_story`, `get_characters`, `get_plot_outline`, or `get_scenes` over loading unrelated state.
2. Create a project only when the user clearly asks to create a Yoroll project, workflow, or interactive game. A request for text in chat is not automatically a project request.
3. Perform every edit with a focused MCP write tool. Keep changes small and within one domain; separate deletion from add/update/move operations.
4. Treat `expected_updated_at` as an optional test-preview preflight value only. It checks a previously observed timestamp before dispatch, but it is not a revision number, lock, compare-and-swap token, or atomic concurrency guarantee. Do not call it a revision or promise CAS semantics. On a stale preflight error, re-read the affected resource before deciding whether to retry.
5. Use only IDs returned by MCP. Respect the scene tool's typed natural, branching, and ending transitions and the documented 1-based reorder index (`-1` appends).
6. Report the operation-confirmed result. Open the project `web_url` only when requested.

## Standalone media

- `generate_image`, `generate_video`, `synthesize_dialogue`, and `generate_bgm` do not require a project ID. Do not invent or request one.
- Image and video results may include an ordinary `web_url` for the matching Yoroll tab. Pair the Browser first, then open that exact URL only when requested or useful for visual inspection.
- Dialogue speech and background-music results do not provide a `web_url`. Report their returned audio URL, MIME type, operation state, and durable `media_asset_id` when present; do not invent an audio page.
- Prefer a durable `media_asset_id` over a temporary provider URL for later references.
- Attach or select media in a workflow only through an explicit project tool and only when the user asks.

## Operations

- Supply a stable caller-generated `client_request_id` for every write that requires it. Reuse it only for an identical retry.
- Poll asynchronous work with `get_operation` and the returned `poll_after_ms`; do not use a fixed tight loop.
- Use `list_operations` to recover after losing an operation ID or starting a new task.
- Call `cancel_operation` only when the user asks and the operation is still cancellable.
- Never retry an ambiguously dispatched write with a new idempotency key; that can duplicate work or charges.

## Confirmation and publishing

Ask for confirmation immediately before:

- spending credits or starting paid generation when the user has not clearly approved it;
- deleting or removing project content or media;
- publishing, submitting for review, or changing an externally visible release.

Run `validate_publish` and inspect `get_publish_status` before `publish_project`. Report structured blockers. Publishing may return an asynchronous operation; do not wait indefinitely for external review.

## Completion reporting

Report only tool-confirmed facts. Include the relevant project or media ID, terminal operation state, credits charged when returned, and an ordinary `web_url` only when the tool actually returns one. Never claim that a Browser action edited the workflow.
