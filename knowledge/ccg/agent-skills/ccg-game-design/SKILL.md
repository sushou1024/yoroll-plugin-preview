---
name: ccg-game-design
description: Plan a complete CCG game before implementation. Use for new game requests, large feature additions, genre or engine selection, scope decisions, core-loop design, level and economy planning, and creation of design.md or asset_manifest/design.json.
---

# Design a CCG Game

1. **Before anything else, check what kind of workspace this is** by looking at
   the project root: `project.godot` present -> this is a Godot workspace;
   `Assets/` + `Packages/` + `ProjectSettings/` present -> this is a Unity
   workspace; neither present -> this is an H5/browser workspace. This check
   comes before track selection and overrides it -- it is not one option among
   several, it's a hard gate.
2. Read `CCG.md` and `CCG_AGENT_GUIDE.md` before deciding the architecture.
3. Infer missing product and art decisions from the request. Do not stop to ask the player for routine choices.
4. Select the smallest reliable track that delivers the requested experience --
   **but only within what step 1 already fixed**:
   - Godot workspace: the track is always "build in the existing Godot project"
     (structured Godot scene/script tools, or direct `.tscn`/`.gd` edits).
     Never scaffold a new Phaser/DOM/Three.js/HTML game next to it, even for an
     "explicit spatial 3D" request that would otherwise suggest Three.js -- that
     H5-only option does not exist once step 1 found `project.godot`.
   - Unity workspace: the track is always "modify the existing Unity project".
     In Yorollcode cloud mode, author runtime C# plus idempotent Editor
     automation in the workspace, then execute it through
     `unity_preflight_check`, `unity_run_tests`, `unity_build_webgl`, and
     `unity_local_preview`. A live Editor `scene-*`/`gameobject-*` MCP is an
     optional local-development path, not a cloud prerequisite. Never scaffold
     a new Phaser/DOM/Three.js game inside the Unity project.
   - H5/browser workspace (neither marker found) -- pick among:
     - Real-time 2D movement or collision: Phaser.
     - Interface-heavy strategy, management, card, merge, or narrative play: DOM/CSS/JavaScript.
     - Explicit spatial 3D: Three.js.
5. Write `design.md` and, for nontrivial games, `asset_manifest/design.json`. Record:
   - player fantasy and core loop;
   - controls, win, loss, settlement, and replay paths;
   - progression, resource loop, retention loop, difficulty curve, and level variation;
   - production decision, technical track, data model, art direction, theme tokens, and responsive layout;
   - required media with dependencies and fallbacks;
   - concrete validation scenarios.
6. Scope toward a polished, stable game. Replace fragile spectacle with a lower-risk equivalent when it does not improve the core experience.
   Interface quality is a delivery requirement, not polish to be dropped when
   time is short — it is the first thing anyone judges the game by, whatever the
   engine. Decide the interface source now, in this order:
   1. `select_ui_kit`, then the engine's materialize step
      (`materialize_ui_kit` for H5 and Godot, `unity_materialize_ui_kit` for
      Unity). Ten curated kits ship with the platform, each carrying
      nine-slice buttons, panels, tabs, checkboxes and progress bars plus a
      palette — use them and follow their sizes and colours.
   2. Only where no kit component fits, generate art with
      `generate_game_image` / `generate_sprite_sheet`.
   3. A flat untextured rectangle is the last resort for a single element, never
      the interface as a whole.
   Shipping default grey boxes for buttons and panels is a failed delivery. This
   applies hardest to Godot and Unity, where an unstyled `Button`/`Panel` or a
   bare UGUI `Image` renders as exactly that unless the kit is wired up.
7. For established games, verify uncertain rules from authoritative sources and encode the rules as testable logic rather than visual approximations.
8. Treat the plan as an implementation contract. Continue directly into implementation unless the current task explicitly requests design only.
