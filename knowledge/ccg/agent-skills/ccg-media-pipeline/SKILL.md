---
name: ccg-media-pipeline
description: Plan, generate, integrate, and audit CCG game media. Use for game images, sprite sheets, video, BGM, UI kits, reusable asset-library content, 3D models, style consistency, asset manifests, and provider fallbacks.
---

# Run the CCG Media Pipeline

1. Write the media dependency graph into `asset_manifest/design.json` before bulk generation. Include purpose, tool, prompt, quality, dependencies, destination, integration point, and fallback.
2. Establish one art-direction anchor. Reuse a successful key image as the reference for related characters, cards, scenes, sprite actions, and first-frame video.
3. Use the CCG MCP tools instead of shelling out to untracked media services:
   - `generate_game_image` for key art and content imagery;
   - `generate_sprite_sheet` for animated 2D states;
   - `generate_game_video` for an intro or narrative clip;
   - `generate_game_bgm` for music;
   - `select_ui_kit`, `materialize_ui_kit`, and `validate_game_ui` for text-safe H5 chrome;
   - `generate_3d_model`, concept/3D generation, import, and asset-library tools where the active workspace supports them.
4. Run independent media calls in parallel when the host supports parallel tool calls. Serialize only dependency edges such as key image to sprite sheet or first frame to video.
5. Consume the returned path or URL exactly. Do not infer an extension, rename a remote URL, or claim integration before the code references the result.
6. Keep generated UI decorative and text-safe. Build actual controls with DOM/CSS, Phaser primitives, or supported nine-slice assets for H5; for Unity workspaces build controls as real Unity UI components (Canvas/Image/Text/Button via `gameobject-create` and `gameobject-component-add`) and prefer the Unity `assets-*`/import tools over CCG's generic media tools for anything the Unity Editor already handles natively.
7. Record every success, provider failure, retry, fallback, and code integration in the manifest or `delivery_report.json`. A failed optional asset must not block a playable game.
8. Audit file sizes, load order, style consistency, animation wiring, mute behavior, video skip/failure behavior, and visible use of every accepted asset.
