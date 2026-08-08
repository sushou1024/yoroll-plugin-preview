---
name: ccg-unity-implementation
description: Build or repair Unity games through Yorollcode's controlled Unity workflow. Use when the workspace root contains Assets/, Packages/, and ProjectSettings/, or the task mentions a Unity scene, GameObject, prefab, component, or the Unity Editor.
---

# Implement a CCG Unity Game

1. Read `CCG_AGENT_GUIDE.md` and any existing `design.md` before making changes.
   Run `unity_preflight_check` first and branch on its result:
   - `execution_mode: "cloud-worker"` with `execution_allowed: true` means the
     Unity Editor is available through Yorollcode's private worker. Continue
     immediately; the absence of live `scene-*`, `gameobject-*`, or
     `script-execute` tools is expected and is **not** a blocker.
   - `execution_mode: "local"` may additionally expose live Unity Editor MCP
     tools. Use them when present.
   - Only `cloud-worker-required`, `execution_allowed: false`, or
     `available: false` is an environment blocker.
2. In cloud-worker mode, write normal runtime `.cs` files under
   `Assets/Game/Scripts` and Editor-only automation under
   `Assets/Game/Editor`. Create or update the playable scene with an idempotent
   static Editor method using `EditorSceneManager`, `GameObject`,
   `AssetDatabase`, and `EditorBuildSettings.scenes`; do not hand-edit Unity
   scene YAML.
3. Prefer the template convention
   `CCG.Game.Editor.GameSceneBuilder.PrepareScene()`. The seeded
   `CCG.Unity.Editor.CcgBuild.BuildWebGL()` calls that method when it exists.
   If an older workspace lacks the hook, update `CcgBuild.BuildWebGL()` to call
   the idempotent scene builder before it reads enabled scenes. Preserve the
   controlled WebGL build pipeline and its output directory.
4. In local mode with live Editor tools, inspect the current scene and console
   first, then use the available structured scene/GameObject/component tools.
   Do not stop merely because those optional tools are absent in cloud mode.
5. For generated art or models, use CCG's media and asset-library tools
   (`use_asset_library`, `generate_game_image`, `generate_3d_model`, etc.).
   Consume the returned paths exactly and reference/import those real files
   from the project; never fabricate a path.
   Search with `use_asset_library { query }`, but import into Unity with
   `unity_import_library_asset { assets: [...] }` — **not** with
   `use_asset_library { import }`, which writes to `assets/lib/`, outside
   `Assets/`, where Unity cannot see it. The Unity tool places each model under
   `Assets/CcgLibrary/<kit>/`, brings along the texture files it references, and
   serves the pre-converted copy for models whose WebP textures Unity cannot
   read. Some models come back in `skipped` with a reason; pick a different
   model rather than working around it. Always pass the full manifest path —
   many kits ship their own `wall.glb`, and a bare filename is rejected as
   ambiguous instead of silently resolving to the wrong kit.
   **Collision does not come with the model.** glTF describes visuals only, so
   an import has renderers and no colliders; a scene built from raw imports
   looks finished but is physically empty, and the walkable area will not match
   what the player sees. Each import therefore also yields
   `collidable_prefab_path`, a sibling prefab — reference it rather than the raw
   `asset_path`, which is only for decoration. Never approximate imported level
   geometry with hand-placed primitives.
   For props that prefab carries mesh colliders. **For characters it carries a
   wired Animator instead**: glTF import leaves animation clips as inert
   sub-assets, so a raw character model stands in its bind pose and slides. The
   build infers a controller from the clip names with `Speed` (float) plus
   `Attack`/`Jump`/`Hit`/`Die` triggers — drive those from gameplay code:

   ```csharp
   animator.SetFloat("Speed", velocity.magnitude);
   animator.SetTrigger("Attack");
   ```

   Give characters a CharacterController or capsule for collision; a mesh
   collider on a skinned mesh is both wrong and expensive. The project renders with URP, and imported glTF materials
   use glTFast's URP shader graphs — do not switch the render pipeline.
   URP strips shaders nothing references, so `Shader.Find` can resolve in the
   Editor and in PlayMode yet return null in the WebGL player, leaving materials
   pink or throwing at startup. Only these are pinned and safe to look up by
   name: `Universal Render Pipeline/Lit`, `.../Simple Lit`, `.../Unlit`,
   `.../Particles/Unlit`, `Sprites/Default`, `UI/Default`. For anything else,
   create a real material asset and reference it from the scene instead of
   resolving a shader at runtime — an asset reference is what keeps it in the
   build. Never diagnose a blank or pink WebGL build from Editor results alone.
6. **UI chrome (hard gate):** before hand-building any UGUI styling, call
   `select_ui_kit` once per game (describe genre, theme and style; it scores
   and records one of ten curated kits), then `unity_materialize_ui_kit`. The
   controlled build imports each PNG as a sprite carrying the kit's nine-slice
   border and writes `Resources/CcgUiKit.asset`. Style from it:

   ```csharp
   var kit = CcgUiKitAsset.Load();
   image.sprite = kit.Sprite("button.primary");
   image.type = Image.Type.Sliced;   // keeps corners crisp at any size
   ```

   `Image.type = Sliced` is what makes the border matter — leave it on
   `Simple` and the corners stretch. Follow the kit's `minSize`/`defaultSize`
   and `textColor` instead of inventing values, and read the palette through
   `PaletteColor`. Generate art with `generate_game_image` only for elements no
   kit component covers. **A bare UGUI `Image` with a flat colour is the last
   resort for one element, never the interface as a whole** — Unity's default
   `Image` renders as an untextured white box, which is exactly the crude look
   this step exists to prevent, and shipping it is a failed delivery.
   **Chinese text (hard gate):** Unity's built-in font has no CJK glyphs and the
   library's other fonts are Latin and controller-icon faces, so a Chinese label
   left on the default font renders as empty boxes. The template bundles
   `Assets/Yoroll/Fonts/NotoSansSC.ttf` (SIL OFL) and the controlled build
   imports it in dynamic mode with a copy at `Resources/CcgCjkFont`. Assign it to
   every `Text`/`TextMesh` that can show Chinese:

   ```csharp
   text.font = Resources.Load<Font>("CcgCjkFont");
   ```

   Do not answer a Chinese-language request with English UI copy because the font
   looked missing — it is there. Verify by reading the `unity_playtest`
   screenshot: real characters, not boxes.
7. Add focused EditMode tests for pure gameplay rules and PlayMode tests for
   the critical playable path. Run `unity_run_tests`, repair compilation/test
   failures, then call `unity_local_preview`. These controlled tools start the
   cloud Editor, import the project, run tests, build WebGL, and return the real
   session preview URL.
8. **Run `unity_playtest` and read the screenshots.** A build result of
   `Succeeded` means the compiler was happy and nothing more — a game whose
   shaders were stripped, whose level has no collision, or whose interface is
   untextured boxes builds cleanly and passes every Editor-side test. This
   loads the real artifact in a browser and reports what it does: whether
   anything rendered, the browser console errors with stack traces, and
   screenshots. Pass `keys` (`["KeyW", "Space"]`) to exercise controls.
   Treat any `console_errors` or `page_errors` entry as a blocker. Then
   actually look at the images: missing textures, magenta materials and flat
   UI boxes are visible there and nowhere else.
9. A Unity delivery is complete only when `unity_playtest` renders without
   runtime errors, `unity_local_preview` reports success, and
   `.ccg/unity-webgl/index.html` plus its build payload exist. Build duration
   can be several minutes; that is expected.
10. Never create `index.html`, `game.js`, or any standalone
   HTML5/Canvas/JavaScript game inside a Unity workspace. The generated
   `.ccg/unity-webgl/index.html` is build output and must not be edited by hand.
