# 骨架模板来源与改造记录

## 来源

- 源仓库：CCG（Yoroll Code），本地 `/Users/ennio/xxx/CCG`
- 源分支：`test`
- 源 commit：`23746420`
- 源路径：`H5GameAI/templates/rpg/`（赛道 R 的 RPG 模板，其中内置了一套题材无关的
  「剧情/过场运行器 + 全屏视频叠层」）
- 拷贝日期：2026-08-08
- 许可与性质：内部原料，随本 skill 分发；剧情内容与美术全部替换，只保留机制。

## 逐文件对照

| 本模板文件 | 源文件 | 关系 |
|---|---|---|
| `index.html` | `templates/rpg/index.html` | 保留 viewport 锁定、全屏铺满、幽灵遮罩自愈脚本、运行时错误捕获结构；`<canvas>` 与 RPG 脚本清单整体替换为 DOM 舞台与影视小游戏脚本 |
| `js/platform.js` | `templates/rpg/js/platform.js` | 保留平台抽象层的收口思路与 `playVideo` 的 `holdOnEnd`（播完冻结最后一帧）行为；重写为双 `<video>` 轮换 + 预加载，删掉 canvas/pointer/keyboard 输入层 |
| `js/engine/story.js` | `templates/rpg/js/engine/story.js` | 保留 `applyEffects` / `process` / `choose` / `goto` / `end` 的运行结构与 `set`/`add`/`flag` 变量语义；数据模型由「steps 数组 + label 跳转」改为「node 图 + 节点 ID 跳转」，并新增图静态校验 `Story.validate()` |
| `js/engine/save.js` | `templates/rpg/js/engine/save.js` | 保留「经 Platform.store 存档、坏档当无档、初始化幂等」；字段由 `{player, curMapId, flags}` 改为 `{node, vars, seen}` + 独立的结局解锁表 |
| `js/ui/render.js` | `templates/rpg/js/engine/screens.js` | 只移植 `sceneSafeRect()`（视频真实显示矩形）与 `drawChoiceOverlay()` 的定位思路——选项必须落在画面内不能落进黑边；实现由 canvas 绘制改为 DOM + CSS |
| `js/slots/registry.js` | 无 | **全新增**。CCG 侧没有「玩法插槽」概念，其赛道是互斥选择 |
| `css/theme.css` | `H5GameAI/prompts/system_prompt.md` 的移动端 CSS 骨架 | 借鉴 `env(safe-area-inset-*)`、最小 44px 触控高度、居中列的思路；主题 token 体系为新写 |
| `content/story.js` | 无 | **全新增**，示例剧情图（2 分支 / 1 玩法 / 2 结局） |

未拷贝：`js/ui.js`（canvas UI 库）、`js/engine/{world,battle,inventory,quest,economy,dialog,state,core}.js`、
`js/content/{actors,maps,quests,theme}.js`、`CCG.md`——全部是 RPG 题材逻辑，与影视小游戏无关。

## CCG 专属接口/环境依赖的处置

逐条排查拷贝进来的代码，命中项如下：

| # | CCG 专属依赖 | 位置 | 处置 |
|---|---|---|---|
| 1 | `postMessage({type:'h5game-error'})` 向父窗口上报运行时错误 | 源 `index.html` | **已移除并标注**。那是 CCG 预览容器的私有协议，本地/静态托管没有接收方。改为中立实现：`window.__filmGameErrors` 收集 + `console.error`，验收时直接读 |
| 2 | 全局 helper `Fit` / `Juice` / `SFX` / `Intro` | 源模板的 phaser 赛道预置 | **未引入**。这些是 CCG 沙箱种下的全局对象，本地不存在，裸引用会直接报错。等价能力（等比缩放、视频叠层、自动播放降级）已用本模板自带代码实现 |
| 3 | `select_ui_kit` / `materialize_ui_kit` / `ui-kits/*/kit.json` 九宫格皮肤 | CCG MCP 工具 | **未引入**，替换为 `css/theme.css` 的主题 token + 组件样式。「不许交付灰方块界面」这条纪律保留，达成手段改为用本模板自带主题 |
| 4 | `CCG.md` / `CCG_AGENT_GUIDE.md` 工作区元数据 | 源模板根目录 | **未拷贝**。云沙箱注入机制，本地没有注入器；其职责由 SKILL.md 正文与本文件承担 |
| 5 | `E.G.theme.assetVersion` 拼 `assets/xxx?v=N` 的资源版本号 | 源 `story.js` `resolveMedia()` | **已中立化**：`Platform.resolveMedia()` 只做「裸文件名补 `assets/`」，不拼版本号（发布走 CDN 目录，版本由目录名承载） |
| 6 | `E.inv.addItem` / `E.world.loadMap` / `player.skills` / `E.toast` | 源 `story.js` `applyEffects()` | **已删除**。RPG 引擎耦合，影视小游戏用 `set`/`add`/`flag` 变量表表达同类需求 |
| 7 | `ONLINE.md` / `online-game.json` / lockstep 联机 | 源体系 | **未引入**。影视小游戏是单机分支叙事 |
| 8 | 硬编码中文 UI 文案与 `Songti SC` 字体（跳过按钮、声音门） | 源 `platform.js` `playVideo()` | **已外提**：文案由 HTML/调用方给，字体走 `css/theme.css` 的 `--font`（系统字体栈，不依赖用户机器上不存在的字体） |
| 9 | `assets/generated/`、`res://`、`.ccg/` 路径约定 | CCG 体系 | **未引入**，改为 `assets/video|image|audio/` 全相对路径 |

## 零构建自检

- 产物 = 本目录整树静态文件，根 `index.html` 双击即可运行，无 `package.json`、无打包器、无 dev server 依赖。
- 剧情数据用 `content/story.js`（全局赋值）而不是 `story.json`：`file://` 下 `fetch()` 会被 CORS 拦掉，
  用 `.js` 才能保证「双击就能跑」。需要 JSON 形态时从这份数据导出即可。
- 已在 Chrome 里实跑一遍：开场 → 分支选择（含倒计时超时走默认分支）→ 结局面板 → 结局解锁计数，
  控制台零报错，`Story.validate()` 输出 `ok: true`。
