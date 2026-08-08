---
name: ccg-h5-implementation
description: Build or repair complete browser games in a CCG H5 workspace. Use when the project has a root index.html or CCG.md and the request involves Phaser, Three.js, DOM/CSS/JavaScript gameplay, levels, controls, UI, persistence, or browser delivery.
---

# Implement a CCG H5 Game

1. Read `CCG.md`, `CCG_AGENT_GUIDE.md`, and any existing `design.md` or asset manifest. Inspect the current files before editing.
2. Preserve a directly runnable root `index.html`. Do not introduce a bundler, build step, local development server, or entry point under another directory.
3. Follow the selected track:
   - Phaser: keep the frame loop, physics, entities, and collisions in game code; use the seeded `Fit`, `Juice`, `SFX`, and `Intro` helpers.
   - DOM/CSS: separate state and rules from rendering for system-heavy games; use semantic controls and responsive layout.
   - Three.js: keep camera-relative controls, stable scene dimensions, bounded asset counts, and a programmatic fallback for every generated model.
4. Implement the whole playable loop: onboarding, controls, goal, win, loss, settlement, replay, progression, and at least one meaningful variation across rounds or levels.
5. Use CCG MCP media tools for content assets. Use only returned paths or URLs, integrate successful outputs immediately, and never invent a successful media result.
6. **UI chrome (hard gate):** before hand-writing any button, panel, or bar
   styling, call `select_ui_kit` once per game (describe genre, theme and
   style; it scores and records a curated kit), then `materialize_ui_kit`.
   Style the interface from the kit's nine-slice art, palette and per-component
   sizes. Generate art with `generate_game_image` only for elements no kit
   component covers. Hand-rolled flat CSS boxes are the last resort for one
   element, never the interface as a whole — a game shipped with plain grey
   rectangles for its buttons and panels is a failed delivery, not a
   simplification.
7. Keep all text legible on desktop and mobile. Do not stretch raster art or use generated whole-screen UI as fake controls.
8. Persist requested progress with local storage and make initialization idempotent.
9. For multiplayer, follow `ONLINE.md` exactly — especially the lockstep
   movement presentation section: local display integrates live input with
   forward-only reconciliation; remote players and NPCs render from
   `confirmedState()` with speed-capped chases; events/VFX deduplicate by
   seen-id set. Never tune `online-game.json` sync values to fix movement feel.
10. Run the delivery validation workflow, repair failures, and leave the workspace in a playable final state rather than reporting unfinished work.
