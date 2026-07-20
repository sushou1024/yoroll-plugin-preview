---
name: yoroll-plugin-basics
description: Show Yoroll's public MCP creation cards, then create, inspect, and edit Yoroll projects; generate standalone images, videos, dialogue speech, and background music; and publish projects through OAuth-protected tools when needed. Use when the user explicitly asks for Yoroll, is already working in a Yoroll project or workflow, or requests a Yoroll-specific account, media, or publishing action. Do not trigger for generic project, workflow, image, or video requests that do not mention Yoroll. MCP performs every business action; do not pair or automate the platform frontend.
---

# Yoroll MCP workflows

Use Yoroll MCP as the source of truth for creation options, account state, credits, projects, workflow content, generated media, operations, and publishing. The two creation-card tools are public. Account and business tools request OAuth only when called.

Never rewrite an MCP-returned URL to `app.yoroll.ai`, `api.lineargame.ai`, or another production origin. This preview uses `https://mcp.yoroll.ai/mcp` and `https://dev.yoroll.ai` only.

## Language

Follow the user's explicit language. Otherwise use the language of the latest user message. Keep tool names and stable identifiers unchanged.

## Authentication

1. `render_creation_menu` and `render_creation_form` are anonymous. Never start OAuth merely to show either card.
2. Let the host start Yoroll OAuth when the first protected tool returns its standard authentication challenge. Never ask for a password, verification code, cookie, OAuth token, or refresh token in chat.
3. Use `get_account` only when an authenticated operation needs an explicit login/account check; do not call it before a public card.
4. If MCP OAuth is unavailable, explain that the Yoroll connection must be completed. Do not fall back to Browser clicking for any business action.

## Creation cards

1. When the user asks generally what Yoroll can create and has not selected an intent, call `render_creation_menu`.
2. When the user explicitly asks for an interactive game, image, or video, skip the menu and call `render_creation_form` with `interactive_game`, `image`, or `video`.
3. The menu's “other” option stays in conversation; never invent a fourth business intent or a generic submit tool.
4. The settings card is a review-and-submit surface. Its submit action calls the existing `create_project`, `generate_image`, or `generate_video` tool, which is where OAuth and credit rules apply.
5. Do not add speech or background-music entries to these cards. Existing explicit speech/music requests may still use their focused tools.
6. Do not pair a Browser, open `/auth/mcp-connect`, or automate the Yoroll platform frontend as part of the card flow. If a result contains `web_url`, return it; open it only when the user separately asks to view it.

## Tool surface: two public cards plus 67 business tools

| Area | Tools |
| --- | --- |
| Public creation cards (2) | `render_creation_menu`, `render_creation_form` |
| Account (2) | `get_account`, `get_credit_balance` |
| Workflow/project reads (14) | `list_projects`, `get_project_status`, `get_project`, `get_story`, `get_characters`, `get_plot_outline`, `get_scenes`, `get_chapter_lock`, `list_workflow_asset_versions`, `get_character_image_history`, `get_scene_image_history`, `get_first_frame_image_history`, `get_scene_video_history`, `get_ui_history` |
| Workflow/project writes (39) | `create_project`, `update_project_title`, `update_generation_config`, `update_ui_config`, `update_story`, `add_character`, `update_character`, `remove_character`, `add_scene`, `update_scene`, `remove_scene`, `reorder_scene`, `select_asset_version`, `add_chapter`, `update_chapter`, `remove_chapter`, `add_episode`, `update_episode`, `remove_episode`, `set_chapter_start_episode`, `duplicate_scene`, `move_scenes`, `remove_scenes`, `clear_scene_transitions`, `set_chapter_lock`, `update_scene_positions`, `update_episode_positions`, `generate_plot`, `generate_characters`, `generate_character_images`, `generate_scene_images`, `generate_scene_videos`, `generate_ui`, `regenerate_character_image`, `regenerate_character_sheet`, `regenerate_scene_image`, `generate_first_frame_image`, `regenerate_scene_video`, `attach_scene_video` |
| Publishing (3) | `get_publish_status`, `validate_publish`, `publish_project` |
| Standalone media/library (6) | `generate_image`, `generate_video`, `synthesize_dialogue`, `generate_bgm`, `list_media_assets`, `get_media_asset` |
| Operations (3) | `get_operation`, `list_operations`, `cancel_operation` |

Use focused tools instead of inventing a generic HTTP or Browser fallback.
Do not call the legacy `approve_browser_session` tool in this plugin experience.

## Account and credits

- Use `get_account` for the signed-in profile and login state.
- Use `get_credit_balance` before a credit-consuming request when the cost or ability to proceed is unclear.
- When a tool provides an estimate or quote, tell the user the expected cost before starting paid generation.

## Projects and workflow editing

1. Use project read tools to understand only the needed domain. Prefer `get_story`, `get_characters`, `get_plot_outline`, or `get_scenes` over loading unrelated state.
2. Create a project only when the user clearly asks to create a Yoroll project, workflow, or interactive game. A request for text in chat is not automatically a project request.
3. Perform every edit with a focused MCP write tool. Keep changes small and within one domain; separate deletion from add/update/move operations.
4. First obtain the current workflow `revision` from `get_project`, `get_project_status` (`workflow.revision`), `get_story`, `get_characters`, `get_plot_outline`, or `get_scenes`, then pass it unchanged as `expected_revision` when the tool supports it. Yoroll applies `expected_revision` atomically with the mutation as compare-and-swap. The supported tools are `update_project_title`, `update_generation_config`, `update_ui_config`, `update_story`, `add_character`, `update_character`, `remove_character`, `add_scene`, `update_scene`, `remove_scene`, `reorder_scene`, `select_asset_version`, `add_chapter`, `update_chapter`, `remove_chapter`, `add_episode`, `update_episode`, `remove_episode`, `set_chapter_start_episode`, `duplicate_scene`, `move_scenes`, `remove_scenes`, `clear_scene_transitions`, `set_chapter_lock`, `update_scene_positions`, `update_episode_positions`, `regenerate_scene_image`, and `generate_first_frame_image`. For the last two tools, the revision protects acceptance of the exact queued job, credit reservation, and workflow marker; provider completion remains asynchronous.
5. Other long-running workflow work does not support revision atomicity. For `generate_plot`, `generate_characters`, `generate_character_images`, `generate_scene_images`, `generate_scene_videos`, `generate_ui`, `regenerate_character_image`, `regenerate_character_sheet`, `regenerate_scene_video`, and `attach_scene_video`, use `expected_updated_at` only as a test-preview stale-state check before dispatch. It is not a revision, lock, compare-and-swap token, or guarantee against changes after dispatch.
6. `publish_project` has no `expected_revision` or compare-and-swap atomicity. Run `validate_publish` immediately before asking for confirmation, inspect its checks and embedded publish status, then pass `validate_publish.workflow_updated_at` as `expected_updated_at`. Yoroll checks it immediately before dispatching the publication build; the read and check do not reserve or lock the workflow.
7. On a revision or timestamp conflict, re-read the affected workflow and reconcile the user's intended change before deciding whether to retry. `create_project` has no prior workflow revision; protect it with its stable `client_request_id`.
8. Use only IDs returned by MCP. Respect the scene tool's typed natural, branching, and ending transitions and the documented 1-based reorder index (`-1` appends).
9. Report the operation-confirmed result. Open the project `web_url` only when requested.

## Standalone media

- `generate_image`, `generate_video`, `synthesize_dialogue`, and `generate_bgm` do not require a project ID. Do not invent or request one.
- Image and video results may include an ordinary `web_url`. Return that URL and open it only when the user separately asks to view the result; do not pair a Browser first.
- Dialogue speech and background-music results do not provide a `web_url`. Report their returned audio URL, MIME type, operation state, and durable `media_asset_id` when present; do not invent an audio page.
- Prefer a durable `media_asset_id` over a temporary provider URL for later references.
- Attach or select media in a workflow only through an explicit project tool and only when the user asks.

## Operations

- Supply a stable caller-generated `client_request_id` for every write that requires it. Reuse it only for an identical retry.
- Poll asynchronous work with `get_operation` using bounded backoff (start around 1 second and cap around 5 seconds); do not use a fixed tight loop. Stop when the operation reaches a terminal status or the user cancels.
- Use `list_operations` to recover after losing an operation ID or starting a new task.
- Call `cancel_operation` only when the user asks and the operation is still cancellable.
- Never retry an ambiguously dispatched write with a new idempotency key; that can duplicate work or charges.

## Confirmation and publishing

Ask for confirmation immediately before:

- spending credits or starting paid generation when the user has not clearly approved it;
- deleting or removing project content or media;
- publishing, submitting for review, or changing an externally visible release.

Run `validate_publish` immediately before `publish_project`, report its structured blockers, inspect its embedded publish status, and pass its `workflow_updated_at` precondition. Use `get_publish_status` for later status refreshes. Publishing may return an asynchronous operation; do not wait indefinitely for external review.

## Completion reporting

Report only tool-confirmed facts. Include the relevant project or media ID, terminal operation state, credits charged when returned, and an ordinary `web_url` only when the tool actually returns one. Never claim that a card or Browser action edited the workflow; the protected MCP business tool is the source of truth.
