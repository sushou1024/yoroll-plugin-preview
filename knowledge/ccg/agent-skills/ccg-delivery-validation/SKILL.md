---
name: ccg-delivery-validation
description: Validate and repair a CCG game before delivery. Use after game implementation or edits to check runtime errors, playability, win/loss/replay paths, controls, responsive UI, media wiring, Godot preflight/playtest, and delivery_report.json.
---

# Validate a CCG Delivery

1. Validate the artifact that preview and publish will actually load, not a substitute demo or source-only component.
2. For H5 games:
   - confirm a directly loadable root `index.html` and all referenced local files;
   - run `validate_game_ui` at representative desktop and mobile sizes;
   - inspect runtime errors and exercise every title, menu, settings, gameplay, settlement, and back/close path;
   - trigger one win, one loss, one replay, and the primary progression or save path;
   - verify directional controls, collision/collection, camera bounds, text fit, resize behavior, mute, and successful media integration;
   - if `online-game.json` enables lockstep multiplayer, run a two-client
     acceptance per ONLINE.md: hold/release/reverse movement shows no backward
     snap on the local player and no backtrack on the remote player after it
     stops; combat VFX/events appear on both clients including right after a
     rollback; remote entities render from `confirmedState()` with a
     speed-capped chase; events are deduplicated by seen-id set, not a
     monotonic id filter. Never edit `online-game.json` sync values to fix
     movement feel — that only relocates the correction.
3. For Godot games, run `godot_preflight_check`, a playtest, and the required web preview/export. Verify the main scene, resources, controls, collisions, generated assets, and animation transitions. If any UI text is Chinese, actually read the rendered web preview screenshot and confirm it shows real characters, not boxed/tofu glyphs — a font override without a CJK fallback (see `ccg-godot-implementation`) silently produces this. Also confirm every player-visible character and key interactive item has real library/generated art, not a placeholder `ColorRect`/primitive mesh (see `ccg-godot-implementation`'s player-visible art gate) — read the actual rendered screenshot, don't just trust the implementation summary.
4. For Unity games, run `unity_preflight_check`. A successful
   `execution_mode: "cloud-worker"` result is a connected Editor execution
   path even when no live `scene-*`/`gameobject-*` MCP tools are listed; do not
   report that expected cloud configuration as blocked. Run the relevant
   EditMode/PlayMode suites with `unity_run_tests`, then call
   `unity_local_preview` and verify `.ccg/unity-webgl/index.html` and its build
   payload actually exist. In `local` mode, additionally use live Editor tools
   and console inspection when they are available.
   Then read `.ccg/scene-audit.json`, written by the controlled build. A Unity
   scene compiles, passes EditMode/PlayMode and builds successfully while being
   physically empty — imported glTF models carry renderers and no colliders, so
   the player walks through walls or falls out of the level and no test notices.
   Treat `passed: false` as a blocker: `collider_coverage` well under 1 means
   level geometry was referenced as raw `.glb` instead of the generated
   collidable prefab, and a low `ground_probes_hit` ratio means the walkable
   area does not match what is rendered. Fix the scene rather than the audit.
   Editor-side results never prove a WebGL build works: shaders resolved by name
   at runtime, and anything else stripped for lacking an asset reference, fail
   only in the browser. Run `unity_playtest`, which loads the real artifact in a
   browser and returns runtime console errors with stack traces plus
   screenshots. Any `console_errors` or `page_errors` entry is a blocker, and
   `loaded: false` means the build rendered nothing at all. Read the returned
   screenshots rather than trusting the summary — missing textures, magenta
   materials and untextured UI are visible only there. If any UI text is
   Chinese, confirm the screenshot shows real characters rather than boxes;
   Unity's default font has no CJK glyphs and the bundled NotoSansSC must be
   assigned explicitly. UI copy silently switched to English for a
   Chinese-language request is also a blocker, not a workaround.
5. **Interface quality (hard gate, every engine):** read the actual rendered
   screenshot of the delivered artifact and judge the chrome, not the
   implementation summary. Buttons, panels, HUD frames, and settlement screens
   must be drawn from the selected UI kit's art or from generated art. Flat
   untextured rectangles — an unstyled Godot `Button`/`Panel`, a bare UGUI
   `Image`, a plain CSS box — are a blocker, not a stylistic choice, even when
   the game is otherwise complete. If a kit was never materialized, that is the
   fix: run `select_ui_kit` and the engine's materialize step, then restyle.
   Nine-slice art applied without slicing enabled (Unity `Image.type = Simple`,
   a Godot `StyleBoxTexture` with no margins) shows as smeared corners once an
   element is resized — check a wide button, not only the default size.
6. Treat blank screens, console errors, dead controls, inaccessible overlays, missing assets, stretched art, clipped text, broken saves, and untriggerable outcomes as blockers.
7. Repair every blocker and rerun the affected scenario. Do not replace execution evidence with a checklist assertion.
8. Write `delivery_report.json` with the tested artifact, scenarios, results, media status, known nonblocking fallbacks, and final pass/fail state. Finish only when the final state is pass.
