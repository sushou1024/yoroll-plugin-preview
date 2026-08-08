# CCG Agent Skills → Yoroll「自定义影视小游戏」改造分析

- 分析日期：2026-08-08
- 原料：`knowledge/ccg/agent-skills/`（源自 CCG `test` 分支 commit `23746420`，见 `knowledge/ccg/PROVENANCE.md`）
- 本次覆盖：`ccg-h5-implementation`、`ccg-game-design`、`ccg-media-pipeline`、`ccg-delivery-validation`（各含 `SKILL.md` + `agents/openai.yaml`）
- 参照的 Yoroll 现状：`plugins/yoroll-test-plugin/skills/yoroll-plugin-basics/SKILL.md`、`plugins/yoroll-test-plugin/.mcp.json`、`README.md`

目标形态：用户在本地 Codex / Claude Code 里写一个**网页影视小游戏**（视频播放 + 分支跳转 + 自定义玩法），素材由 Yoroll 平台 MCP 生成，成品通过平台 `upload-game` 入口发布。

---

## 0. 原料的真实体量（先校准预期）

四个 SKILL.md 加起来只有 176 行，全部是**编号步骤式硬约束**，没有代码骨架、没有 reference 子文件、没有 scripts。`agents/openai.yaml` 每个只有 4 行 `interface` 块（`display_name` / `short_description` / `default_prompt`），不含 `dependencies`——而 Yoroll 现有的 `yoroll-plugin-basics/agents/openai.yaml` 是带 `dependencies.tools`（mcp: yoroll）的，这是改造时必须补齐的差异。

结论：这批原料的价值在**规则与验收标准的密度**，不在可复用代码。改造是「重写正文 + 保留纪律」，不是「改几个工具名」。

---

## 1. 每个 skill 的内容结构速览

### 1.1 `ccg-game-design`（58 行，8 步）

| 段落 | 职责 |
|---|---|
| frontmatter description | 触发场景：新游戏请求、大功能、选题材/选引擎、定范围、核心循环、关卡与经济、产出 `design.md` / `asset_manifest/design.json` |
| 步骤 1 | **工作区探测硬门禁**：看根目录 `project.godot` / `Assets|Packages|ProjectSettings` / 都没有 → H5。此判定先于并覆盖后续所有选择 |
| 步骤 2 | 读 `CCG.md`、`CCG_AGENT_GUIDE.md` 再定架构 |
| 步骤 3 | 缺失的产品/美术决策自己补，不为常规选择打断用户 |
| 步骤 4 | 轨道选择：Godot / Unity 工作区锁死；H5 工作区内三选一（实时 2D 移动碰撞→Phaser；界面重的策略/管理/卡牌/合成/叙事→DOM/CSS/JS；显式 3D→Three.js） |
| 步骤 5 | 设计文档必须记录的 6 类内容：玩家幻想与核心循环 / 操作与胜负结算重玩 / 进程与资源与留存与难度曲线与关卡变化 / 生产决策与技术轨道与数据模型与美术方向与主题 token 与响应式布局 / 所需媒体及依赖与降级 / 具体验证场景 |
| 步骤 6 | 范围收敛（脆弱的炫技换成低风险等价物）+ **界面质量是交付要求**，界面来源三级优先：UI kit → 生成美术 → 单元素兜底纯色矩形 |
| 步骤 7 | 已有成型玩法要查权威规则，把规则编码成可测试逻辑而非视觉近似 |
| 步骤 8 | 计划即实现契约，除非明确只要设计，否则直接进入实现 |

职责一句话：**门禁 → 轨道 → 设计文档字段清单 → 范围与界面质量纪律 → 交棒实现**。

### 1.2 `ccg-h5-implementation`（32 行，10 步）

| 段落 | 职责 |
|---|---|
| frontmatter description | 触发条件写死为「项目根有 `index.html` 或 `CCG.md`」+ Phaser / Three.js / DOM 玩法关键词 |
| 步骤 1 | 读 `CCG.md`、`CCG_AGENT_GUIDE.md`、`design.md`、asset manifest；改前先看现状 |
| 步骤 2 | **产物约束**：根目录 `index.html` 可直接打开运行；禁止引入打包器、构建步骤、本地 dev server、别处的入口 |
| 步骤 3 | 三轨道各自的实现要点（Phaser：帧循环/物理/实体/碰撞在游戏代码里，用种子化的 `Fit`/`Juice`/`SFX`/`Intro` helper；DOM/CSS：状态与规则同渲染分离、语义化控件、响应式；Three.js：相机相对操作、稳定场景尺寸、有界资产数、每个生成模型都要有程序化兜底） |
| 步骤 4 | **完整可玩循环清单**：引导、操作、目标、胜、负、结算、重玩、进程，外加至少一处跨轮次/关卡的有意义变化 |
| 步骤 5 | 内容资产走 CCG MCP 媒体工具；只用返回的路径/URL；成功即刻接入；**禁止编造成功的媒体结果** |
| 步骤 6 | **UI chrome 硬门禁**：手写按钮/面板/条之前必须先 `select_ui_kit`（每局一次）再 `materialize_ui_kit`；只有 kit 覆盖不到的元素才 `generate_game_image`；「灰色方块界面 = 交付失败」 |
| 步骤 7 | 桌面与移动端文字都要可读；不拉伸位图；不用整屏生成图冒充控件 |
| 步骤 8 | 进度用 localStorage 持久化，初始化幂等 |
| 步骤 9 | 多人：严格遵守 `ONLINE.md` 的 lockstep 表现层规则；禁止改 `online-game.json` 同步参数来「调手感」 |
| 步骤 10 | 跑交付验证流程、修复失败、工作区留在可玩终态，不允许报告未完成 |

### 1.3 `ccg-media-pipeline`（21 行，8 步）

| 段落 | 职责 |
|---|---|
| 步骤 1 | 批量生成前先把**媒体依赖图**写进 `asset_manifest/design.json`：用途、工具、prompt、质量、依赖、目标位置、接入点、降级 |
| 步骤 2 | 建立**唯一美术锚点**：一张成功的 key image 作为后续角色/卡牌/场景/精灵动作/视频首帧的参考 |
| 步骤 3 | 工具矩阵：`generate_game_image` / `generate_sprite_sheet` / `generate_game_video` / `generate_game_bgm` / `select_ui_kit` + `materialize_ui_kit` + `validate_game_ui` / `generate_3d_model` 与导入、素材库工具 |
| 步骤 4 | 独立媒体调用并行；只有依赖边（key image→sprite sheet、首帧→视频）串行 |
| 步骤 5 | **原样消费返回值**：不猜扩展名、不重命名远程 URL、代码没引用前不许声称已接入 |
| 步骤 6 | 生成图只做装饰且文字安全；真正的控件用 DOM/CSS、Phaser 图元或九宫格资产 |
| 步骤 7 | 成功/供应商失败/重试/降级/代码接入全部记进 manifest 或 `delivery_report.json`；可选资产失败不得阻塞可玩性 |
| 步骤 8 | 审计：文件体积、加载顺序、风格一致性、动画接线、静音行为、视频跳过/失败行为、每个已接受资产都被可见地使用 |

### 1.4 `ccg-delivery-validation`（65 行，8 步）

| 段落 | 职责 |
|---|---|
| 步骤 1 | 验的必须是**预览/发布真正会加载的产物**，不是替身 demo 或只验源码组件 |
| 步骤 2（H5，最相关） | 根 `index.html` 与全部本地引用可加载；桌面+移动尺寸各跑 `validate_game_ui`；查运行时错误并走遍标题/菜单/设置/玩法/结算/返回关闭路径；触发一次胜、一次负、一次重玩、主进程或存档路径；验方向控制、碰撞/收集、相机边界、文字自适应、resize、静音、媒体接入；多人再加两客户端验收 |
| 步骤 3 | Godot 专用：`godot_preflight_check` + playtest + web 预览导出；中文必须看渲染截图确认不是 tofu 方块；每个玩家可见角色与关键交互物必须有真美术不是 `ColorRect` |
| 步骤 4 | Unity 专用：`unity_preflight_check` / `unity_run_tests` / `unity_local_preview` / `.ccg/scene-audit.json`（`collider_coverage`、`ground_probes_hit`）/ `unity_playtest` 真浏览器加载与截图；编辑器结果不能证明 WebGL 可用 |
| 步骤 5 | **界面质量硬门禁（全引擎）**：读真实渲染截图判断 chrome；纯色无贴图矩形是 blocker；九宫格没开切片会在拉宽时糊角，要验宽按钮 |
| 步骤 6 | blocker 定义清单：白屏、控制台报错、失效控件、够不到的浮层、缺资产、拉伸美术、截断文字、坏存档、触发不了的结局 |
| 步骤 7 | 修完每个 blocker 并重跑受影响场景；**不许用勾选清单代替执行证据** |
| 步骤 8 | 写 `delivery_report.json`：被测产物、场景、结果、媒体状态、已知非阻塞降级、最终 pass/fail；只有 pass 才算完成 |

---

## 2. CCG 专属依赖清单与 Yoroll 替换建议

标记含义：**替换** = 换成 Yoroll MCP 工具或本地等价物；**本地化** = 保留概念但落到本地文件/浏览器操作；**删除** = 影视小游戏语境不存在，整段砍掉。

### 2.1 MCP / 工具名依赖

| # | CCG 依赖 | 出现位置 | 性质 | Yoroll 语境替换建议 |
|---|---|---|---|---|
| T1 | `generate_game_image` | media-pipeline 步骤 3；h5 步骤 6；game-design 步骤 6 | 替换 | → Yoroll MCP `generate_image`。注意语义差：CCG 的是「游戏美术生成」，Yoroll 的是通用图像生成且**不需要 project_id**（见 `yoroll-plugin-basics` 的 Standalone image and video 段）。prompt 模板要自己带游戏用途约束（透明底、九宫格友好、文字安全区） |
| T2 | `generate_sprite_sheet` | media-pipeline 步骤 3 | 删除（降级为可选） | Yoroll 侧无对应工具。影视小游戏主体是实拍/生成视频片段，精灵表不是核心。若确需帧动画，改为「用 `generate_video` 出短循环片段 + `<video loop>`」或 CSS 关键帧 |
| T3 | `generate_game_video` | media-pipeline 步骤 3 | 替换 | → Yoroll MCP `generate_video`。这是新形态的**主素材通道**，地位从 CCG 里的「intro 或叙事短片」升级为「每个剧情节点的正片」。必须配合 `get_operation` 轮询（Yoroll 是异步 operation 模型，CCG skill 里没有这层） |
| T4 | `generate_game_bgm` | media-pipeline 步骤 3 | 删除 | Yoroll 插件 README 与 basics skill 明确写了「Dialogue speech and background music are not advertised or routed in this plugin's first-run experience」。BGM 一律走用户自备本地音频文件，不在 skill 里推荐生成 |
| T5 | `select_ui_kit` / `materialize_ui_kit` | h5 步骤 6（硬门禁）；game-design 步骤 6；delivery 步骤 5 | 替换（换实现，保门禁） | Yoroll 无 UI kit 工具。改为在新 skill 里**内置一套影视风 HTML/CSS 主题 token + 组件样式**（选项卡片、进度条、字幕条、结局面板），作为本地资源随 skill 分发。「不许交付灰色方块」这条纪律原样保留，只是达成手段从「调 kit 工具」变成「用 skill 自带主题」 |
| T6 | `validate_game_ui` | media-pipeline 步骤 3；delivery 步骤 2 | 本地化 | 无对应工具。改为「在本地浏览器按代表性桌面与移动尺寸打开产物并截图核对」（Codex/Claude Code 本地可用浏览器工具或手工核对清单）。保留「桌面 + 移动两档尺寸都要验」的要求 |
| T7 | `generate_3d_model`、概念图/3D 生成、导入、asset-library 工具 | media-pipeline 步骤 3、6 | 删除 | 影视小游戏无 3D 资产管线 |
| T8 | `godot_*` 全家（`godot_preflight_check`、playtest、web 导出等） | delivery 步骤 3；game-design 步骤 4 | 删除 | — |
| T9 | `unity_*` 全家（`unity_preflight_check`、`unity_run_tests`、`unity_build_webgl`、`unity_local_preview`、`unity_playtest`、`unity_materialize_ui_kit`）、`scene-*` / `gameobject-*` MCP | delivery 步骤 4；game-design 步骤 4 | 删除 | — |
| T10 | 「用 CCG MCP 工具而不是 shell 出去调未受管的媒体服务」这条原则 | media-pipeline 步骤 3 开头 | 保留（换主语） | 改为「素材一律走 Yoroll MCP；不要 curl 第三方生成 API，不要把外部图床 URL 直接写进游戏」 |
| T11 | **缺口**：CCG 无发布工具 | — | 新增 | Yoroll 侧需要补 `upload-game` 发布入口，以及 `list_media_assets`（拉取已生成素材）。**注意：这两个名字在本仓库里检索不到**——`plugins/yoroll-test-plugin/skills/yoroll-plugin-basics/SKILL.md` 里只出现 `create_project` / `generate_image` / `generate_video` / `get_operation` / `create_browser_handoff` / `get_story` / `get_characters` / `get_plot_outline` / `get_scenes` / `validate_publish` / `publish_project` / `get_publish_status` / `render_creation_menu` / `get_creation_options`。落地前必须以 MCP 服务端实际 tool 列表为准核对参数与返回结构 |

### 2.2 文件 / 路径约定依赖

| # | CCG 依赖 | 出现位置 | 性质 | 替换建议 |
|---|---|---|---|---|
| P1 | `CCG.md` | game-design 步骤 2；h5 description + 步骤 1 | 替换 | → 本地 `GAME.md`（或 `yoroll-game.json`）。CCG 里它是云沙箱种下的工作区元数据（`prompts/README.md` 显示运行时用它填 `{{PROJECT_ROOT}}`/`{{ENGINE_VERSION}}`/`{{MAIN_SCENE}}` 等 12 个占位符）。Yoroll 本地场景没有注入器，改为**由 skill 自己首次创建**的项目描述文件：项目名、Yoroll `project_id`（若有）、素材目录、入口文件、发布目标 |
| P2 | `CCG_AGENT_GUIDE.md` | game-design 步骤 2；h5 步骤 1；godot/unity skill | 删除 | 沙箱内下发的 agent 指南，本地不存在。它承担的内容改由新 skill 正文直接承载 |
| P3 | `design.md` | game-design 步骤 5；h5 步骤 1 | 原样保留 | 概念完全通用，字段清单要改成影视小游戏字段（见 §5） |
| P4 | `asset_manifest/design.json` | game-design 步骤 5；media-pipeline 步骤 1、7 | 本地化改名 | → `assets/media-manifest.json`。字段扩展：`media_asset_id`、`operation_id`、`local_path`、`source_prompt`、`duration`、`used_by_node`（挂到哪个剧情节点）、`fallback` |
| P5 | 根 `index.html` 必须可直接打开、禁打包器/dev server | h5 步骤 2；delivery 步骤 2 | **原样保留（强烈建议）** | 这条对 `upload-game` 是刚需：静态零构建产物才能被平台直接托管。唯一要补的是「本地看效果时用 `file://` 可能受限于视频跨域/自动播放策略，允许起一个只读静态 server 仅供预览，但产物本身不得依赖它」 |
| P6 | `delivery_report.json` | media-pipeline 步骤 7；delivery 步骤 8 | 原样保留 | 名字可留。内容改为影视小游戏场景（见 §5.4） |
| P7 | `ONLINE.md` / `online-game.json` / lockstep 多人整段 | h5 步骤 9；delivery 步骤 2 末尾 | 删除 | 影视小游戏是单机分支叙事，整段（h5 5 行 + delivery 8 行）直接砍掉 |
| P8 | `.ccg/unity-webgl/index.html`、`.ccg/scene-audit.json`、`.ccg/web-export` | delivery 步骤 4；unity skill | 删除 | — |
| P9 | `res://` 路径体系、`prefabs/`、`CCG_ASSETS.md` | 主 system prompt（非本次四个 skill，但同源） | 删除 | — |
| P10 | 「资产放 `res://assets/generated/`」式目录约定 | 同上 | 替换 | → 本地 `assets/video/`、`assets/image/`、`assets/audio/`，全部用**相对路径**引用（`upload-game` 打包的前提） |
| P11 | 种子化 helper `Fit` / `Juice` / `SFX` / `Intro` | h5 步骤 3 | 替换 | 这是 CCG 沙箱模板预置的全局 helper，本地不存在。要么删掉引用，要么把等价物（自适应缩放、反馈动效、音效池、开场序列）作为 skill 自带的 `assets/` 模板代码分发。**不能保留裸引用，否则 agent 会去调不存在的全局对象** |
| P12 | 「社区模板」体系（`platformer_3d_kenney` / `tps_demo` / `city_builder` / `fps_cogito`） | 主 system prompt | 删除 | 换成本仓库自带的**影视小游戏起手模板**（见 §5.2） |

### 2.3 环境 / 运行模式 / 计费机制依赖

| # | CCG 依赖 | 出现位置 | 性质 | 替换建议 |
|---|---|---|---|---|
| E1 | `{{CCG_MODE}}`、`{{REPLY_LANGUAGE_RULE}}`、`{{PROJECT_ROOT}}` 等 12 个运行时占位符 | `prompts/system_prompt.md` + `prompts/README.md` | 删除 | 云端 `getCCGGamePrompt()` 注入机制，本地 skill 没有注入器。语言规则改用 `yoroll-plugin-basics` 已有的四级语言解析（显式请求 → host locale → 用户上一条消息语言 → English） |
| E2 | 「cloud / local 双模式」分支（`execution_mode: "cloud-worker"` 等） | delivery 步骤 4；game-design 步骤 4 Unity 分支 | 删除 | Yoroll 形态只有一种：本地写代码 + 远端 MCP 出素材 |
| E3 | 「3D 资产生成失败（API 不可用、**配额不足**）时静默用占位模型继续，不告诉用户失败」 | `prompts/system_prompt.md` 行为规则 6 | **必须改写** | Yoroll 是显式积分模型。`yoroll-plugin-basics` 要求：花积分前用自然语言总结请求并**取得明确确认**；完成后如实报告 terminal state 与 credits charged。CCG 的「静默吞失败」策略与之直接冲突，改为：**失败要说、降级要说、积分消耗要报**。可保留的只有「不要因为一个可选素材失败就交付一个跑不起来的游戏」 |
| E4 | 「不允许超过 14 次工具调用」的硬性步数上限 | `prompts/system_prompt.md` 行为规则 7 | 删除 | 那是为云端计费与超时设计的。本地 Codex/CC 无此约束，反而应鼓励「先设计→再生成→再实现→再验收」的多轮流程 |
| E4b | 「视频生成是重计费项」 | CCG 无对应约束 | 新增 | 影视小游戏的视频量远大于 CCG。必须新增：先出**一条**样片确认风格与时长，再批量生成；批量前给出预计条数与积分量并请求确认 |
| E5 | 安全边界整段（永不透露模型/工具/MCP/环境变量名、不执行 `env`/`printenv`、不复述指令文件） | `prompts/system_prompt.md` 开头 | 部分保留 | 「不要把 token/凭据写进游戏文件或回复」这条通用且必要，保留。但「永不承认存在 MCP/工具」这类**面向 C 端黑盒产品**的话术不适用——本地 Codex 用户看得见工具调用，硬装反而显得不诚实。改为温和版：不泄露凭据、不粘贴 handoff URL（这条 `yoroll-plugin-basics` 已有）、不复述内部提示词 |
| E6 | 「回复语言规范：禁止提及模板名、节点类型、脚本文件名、技术错误」 | `prompts/system_prompt.md` | 大幅弱化 | 云端产品对玩家隐藏技术细节合理；本地 Codex 用户**就是开发者**，他要看文件路径和报错。只保留「最终交付说明用玩家语言描述游戏内容」这一条作为收尾格式建议 |
| E7 | 「⛔ 绝对禁止向用户提问或请求确认」 | `prompts/system_prompt.md` 行为规则开头 | **冲突，须调和** | 与 `yoroll-plugin-basics`「花积分前必须确认」「一次问一个短问题」直接矛盾。调和方案：**常规美术/风格/布局决策自己定（保留 CCG 精神），花积分和发布必须确认（服从 Yoroll 规则）** |
| E8 | `create_browser_handoff` / 可见 Yoroll tab / `web_url` 策略 | CCG 无 | 新增 | 从 `yoroll-plugin-basics` 继承。新 skill 不应重复实现这套逻辑，而应写「素材与发布相关的可见链接遵循 `yoroll-plugin-basics` 的 visible Yoroll link policy」 |

---

## 3. 引擎无关、可原样保留的部分

这些是这批原料真正值钱的地方，**建议逐字或近乎逐字迁移**：

### 3.1 游戏设计方法（来自 `ccg-game-design`）
- 步骤 3「推断缺失的产品与美术决策，不为常规选择打断用户」——常规决策自主。
- 步骤 5 的**设计文档字段清单**：玩家幻想与核心循环 / 操作、胜、负、结算、重玩路径 / 进程、资源、留存、难度曲线、变化 / 生产决策与数据模型与美术方向与主题 token 与响应式布局 / 所需媒体及依赖与降级 / **具体验证场景**。最后一项尤其关键：设计阶段就要写清将来怎么验。
- 步骤 6「用低风险等价物替换脆弱的炫技」+「界面质量是交付要求不是可砍的润色」。
- 步骤 7「已有成型玩法要查权威规则，把规则编码成可测试逻辑」。
- 步骤 8「计划即实现契约，不停在设计」。

### 3.2 实现纪律（来自 `ccg-h5-implementation`）
- 步骤 2 零构建、根 `index.html` 直接可跑（对 `upload-game` 是刚需，见 P5）。
- 步骤 3 中 DOM/CSS 轨道的「**状态与规则同渲染分离**」——这正是分支叙事引擎该有的架构。
- 步骤 4 完整可玩循环清单（引导/操作/目标/胜/负/结算/重玩/进程 + 至少一处有意义变化）。
- 步骤 5「只用返回的路径或 URL，成功即接入，**绝不编造成功的媒体结果**」——反幻觉，通用。
- 步骤 7 文字在桌面与移动端都可读、不拉伸位图、不用整屏生成图冒充控件。
- 步骤 8 localStorage 持久化 + 初始化幂等。
- 步骤 10「留在可玩终态，不报告未完成」。

### 3.3 媒体规划（来自 `ccg-media-pipeline`）
- 步骤 1「批量生成前先写依赖图」及其字段（用途/工具/prompt/质量/依赖/目标位置/接入点/降级）。
- 步骤 2「**唯一美术锚点**，用一张成功的 key image 作为后续参考」——影视小游戏里这条更重要（角色跨镜头一致性）。
- 步骤 4 并行/串行规则（独立并行，依赖边串行）。
- 步骤 5 原样消费返回值，不猜扩展名不重命名。
- 步骤 7 全过程记账（成功/失败/重试/降级/接入）。
- 步骤 8 审计维度：文件体积、加载顺序、风格一致性、静音行为、**视频跳过/失败行为**、每个已接受资产可见地被使用。

### 3.4 验收清单（来自 `ccg-delivery-validation`）
- 步骤 1「验预览/发布真正加载的产物」。
- 步骤 2 的 H5 主体：可加载性、桌面+移动两档尺寸、控制台错误、走遍每条 UI 路径、触发胜/负/重玩/存档、文字自适应与 resize、静音、媒体接入确认。
- 步骤 5「读**真实渲染截图**判断界面，而不是读实现摘要」。
- 步骤 6 blocker 清单（白屏/报错/死控件/够不到的浮层/缺资产/拉伸/截断/坏存档/触发不了的结局）。
- 步骤 7「不许用勾选清单代替执行证据」。
- 步骤 8 `delivery_report.json` + 「只有 pass 才算完成」。

---

## 4. 建议的新 skill 结构

四个改造成 **4 个**，保持职责边界不变（设计 / 实现 / 素材 / 验收发布），因为这四段在影视小游戏里同样是四类不同的工作与不同的失败模式。另外**新增 1 个共享参考目录**承载模板代码。

命名统一前缀 `yoroll-filmgame-`，与现有 `yoroll-plugin-basics` 并列，且 description 明确「本 skill 假定 Yoroll MCP 可用，会话级策略遵循 `yoroll-plugin-basics`」。

### 4.1 `yoroll-filmgame-design`

- **name**: `yoroll-filmgame-design`
- **description**: Plan a browser-based interactive film game before implementation. Use for new film-game requests, branching-narrative structure, choice and ending design, pacing across video clips, custom mechanics layered on playback, and producing `design.md` plus `story.json` and `assets/media-manifest.json` skeletons. Assumes Yoroll MCP for media.
- **章节骨架**：
  1. 先看工作区（有无 `GAME.md` / `story.json` / `index.html`）——判断新建还是续做，取代 CCG 的引擎探测门禁
  2. 常规产品与美术决策自主推断，不打断用户（继承 game-design 步骤 3）
  3. 叙事结构选型：线性带选择 / 有向图多结局 / 状态机带变量 / hub-and-spoke，按规模选最小可靠者
  4. 写 `design.md`：故事前提与主角、**剧情图节点清单与结局清单**、每节点的片段时长与情绪、选择点与判定条件、自定义玩法（QTE / 收集 / 好感度 / 线索本）、变量与存档、美术锚点与主题 token、竖屏或横屏与响应式、素材清单与降级、**具体验证场景（含每条结局的到达路径）**
  5. 同时产出 `story.json` 骨架（结构见 §6.2）——设计产物即数据，不是散文
  6. 范围收敛与界面质量：低风险等价物；界面用 skill 自带影视主题，不交付灰色方块
  7. 计费预估：列出需要生成的视频条数/图片张数，提示这是积分消耗大头，**批量前先出一条样片确认**
  8. 计划即契约，直接进入实现

### 4.2 `yoroll-filmgame-implementation`

- **name**: `yoroll-filmgame-implementation`
- **description**: Build or repair a zero-build browser interactive film game — HTML5 video playback, branching graph navigation, choice overlays, custom mechanics, save state, and mobile-safe autoplay. Use when the project has `index.html` / `story.json` / `GAME.md` and the request involves playback, branching, choices, endings, HUD, or persistence.
- **章节骨架**：
  1. 先读 `GAME.md`、`design.md`、`story.json`、`assets/media-manifest.json`；改前看现状
  2. **零构建产物约束**：根 `index.html` 直接可跑，全相对路径，无打包器（`upload-game` 前提）；本地预览可起只读静态 server，产物不得依赖它
  3. 架构：三层分离——`story.json`（数据）/ 引擎（图遍历 + 变量 + 存档）/ 渲染（播放器 + 覆盖层 UI）。禁止把剧情写死在渲染代码里
  4. **视频播放器骨架**（见 §6.1）：`playsinline` + `muted` 起播 + 用户手势解锁音频、`preload`、poster 首帧、`ended` 驱动跳转、`timeupdate` 驱动定时选择窗口、`error`/`stalled` 降级、下一分支预加载
  5. **分支跳转引擎**：节点/边/条件/变量/结局；跳转必须是「引擎改状态 → 渲染响应」单向流
  6. 覆盖层 UI：选择卡片、字幕条、进度/章节指示、结局面板、回看与跳过已看片段；用 skill 自带影视主题，不手搓灰色方块
  7. 自定义玩法接入点：QTE、点击热区、道具/线索、好感度数值——都作为「节点上的可选组件」而不是硬编码分支
  8. 完整可玩循环：开场 → 操作说明 → 至少一条完整通关路径 → 至少两个不同结局 → 结算 → 重玩/回看 → 进度持久化（localStorage，初始化幂等）
  9. 素材只用 `media-manifest.json` 里已落地的本地相对路径；**绝不编造成功的生成结果**，绝不把会过期的临时 URL 写进代码
  10. 移动端与弱网：竖屏优先或双向适配、文字可读、首屏加载态、视频加载失败的文字兜底
  11. 跑验收流程，修完 blocker，留在可玩终态

### 4.3 `yoroll-filmgame-media`

- **name**: `yoroll-filmgame-media`
- **description**: Plan, generate, fetch, localize, and audit media for a Yoroll interactive film game. Use for shot planning, keyframe and character consistency, video clip generation through Yoroll MCP, pulling existing platform assets into the local project, `assets/media-manifest.json` upkeep, and fallbacks.
- **章节骨架**：
  1. 批量生成前先把**镜头/素材依赖图**写进 `assets/media-manifest.json`（字段见 P4）；每条素材必须绑定它服务的剧情节点
  2. 建立唯一美术锚点：先出角色/场景 key image，之后所有片段以它为参考，保证跨节点一致性
  3. 工具映射：`generate_image` 出 key image / poster / 选项配图；`generate_video` 出节点片段；`list_media_assets` 拉取平台上已有素材（**工具名待与 MCP 实际列表核对**）
  4. **异步 operation 纪律**：业务调用返回 operation ID 后即视为已受理，用 `get_operation` 有界退避轮询，**绝不重复提交**（直接继承 `yoroll-plugin-basics`）
  5. 并行/串行：不同节点的独立片段并行；key image → 首帧 → 视频这条依赖边串行
  6. **素材落地流程**（新增，见 §6.3）：优先记录持久 `media_asset_id`；下载到 `assets/video|image|audio/`；用确定性文件名；代码只引用本地相对路径
  7. 原样消费返回值：不猜扩展名、不重命名、代码没引用前不许声称已接入
  8. 计费纪律：视频是大头，先出一条样片确认风格与时长再批量；批量前报预计条数并取得确认；完成后如实报告消耗
  9. 全过程记账（成功/失败/重试/降级/接入点）；可选素材失败不得阻塞可玩性，但**必须告知用户**（与 CCG 的静默吞失败相反）
  10. 审计：总体积与单文件体积、加载顺序、风格一致性、每条片段被哪个节点使用、静音行为、跳过与失败行为

### 4.4 `yoroll-filmgame-delivery`

- **name**: `yoroll-filmgame-delivery`
- **description**: Validate, repair, and publish a Yoroll interactive film game. Use after implementation or edits to check playback, every branch and ending, mobile autoplay, asset wiring, responsive layout, `delivery_report.json`, and the platform `upload-game` publish path.
- **章节骨架**：
  1. 验的必须是 `upload-game` 真正会上传的那份产物，不是替身 demo
  2. 静态自检：根 `index.html` 可直接加载；**全部引用为相对路径且文件存在**（绝对路径 / 残留远程 URL 是 blocker）；总体积在平台上限内
  3. **分支覆盖验收**（新增，见 §6.4）：遍历 `story.json`，确认无孤儿节点、无死端、每个结局至少有一条可达路径且实际走通一次；条件分支的每个分支都要触发
  4. 播放验收：每个节点片段能播且能自然结束并跳转；跳过/快进行为正确；定时选择窗口超时有默认分支；连播不留黑帧
  5. 移动端验收：`playsinline` 生效不全屏劫持、静音自动播放可用、首次手势解锁音频、竖屏与横屏文字可读、控件可点
  6. 弱网与失败路径：慢加载有加载态、片段 404 或 `error` 时有文字兜底而非白屏
  7. 存档：进度持久化、重开恢复、重玩清档、多结局回看解锁状态正确
  8. **界面质量硬门禁**：读真实渲染截图判断，不读实现摘要；纯灰方块按钮/面板是 blocker
  9. blocker 清单：白屏、控制台错误、失效控件、够不到的浮层、缺素材、拉伸画面、截断文字、坏存档、**触发不了的结局**、**指向过期远程 URL 的片段**
  10. 修完每个 blocker 并重跑受影响场景；不许用勾选清单代替执行证据
  11. 写 `delivery_report.json`（字段见 §5.4），只有 pass 才继续
  12. 发布：走平台 `upload-game` 入口；发布前明确确认；发布后按 `yoroll-plugin-basics` 的 visible link policy 把返回的 `web_url` 在浏览器里展示

### 4.5 共享模板目录（新增，非 skill）

`skills/yoroll-filmgame-implementation/assets/` 下随 skill 分发：
- `template/index.html` + `player.js` + `engine.js` + `theme.css`（零构建可跑的最小影视小游戏骨架）
- `template/story.example.json`（分支数据结构范例）
- `reference/story-schema.md`（`story.json` 字段说明）
- `reference/mobile-video.md`（移动端自动播放/音频解锁/预加载的踩坑清单）

这样 §2.1 T5（UI kit）和 §2.2 P11（种子 helper）的空缺才真正被补上——否则 skill 只有戒律没有工具。

### 4.6 `agents/openai.yaml` 模板

每个新 skill 都要按 `yoroll-plugin-basics` 的格式补 `dependencies`（CCG 原件没有）：

```yaml
interface:
  display_name: "Yoroll Film Game — Implementation"
  short_description: "Build a zero-build browser interactive film game"
  default_prompt: "Use $yoroll-filmgame-implementation to implement this interactive film game completely in the current workspace."

dependencies:
  tools:
    - type: "mcp"
      value: "yoroll"
      description: "Yoroll OAuth MCP server"
      transport: "streamable_http"
      url: "https://mcp.yoroll.ai/mcp"
```

### 4.7 `delivery_report.json` 建议字段

```
artifact / entry_file / total_size
story_graph: { node_count, ending_count, unreachable_nodes[], dead_ends[] }
scenarios: [ { name, path_taken[], result, evidence } ]   // evidence = 截图或控制台记录，不接受空断言
media: [ { asset_id, local_path, used_by_node, status } ]
known_fallbacks[]
blockers[]
final: pass | fail
publish: { attempted, upload_game_result, web_url }
```

---

## 5. 缺口：影视小游戏特有而 CCG skill 完全没覆盖的内容

CCG 四个 skill 里**没有一个字**涉及以下内容，这是改造工作量的主体。

### 5.1 视频播放器骨架（零覆盖）

CCG 的 `generate_game_video` 只用于「intro 或叙事短片」，delivery 里只有一句「视频跳过/失败行为」。影视小游戏里视频**就是主体**，需要新写一整套：

- **移动端自动播放限制**：`<video muted playsinline autoplay>` 才可能自动起播；有声播放必须绑在首次用户手势上（开始按钮 = 音频解锁点）。iOS Safari 尤其严格。这是新形态最高频的失败原因，CCG 完全没有。
- **无缝衔接**：双 `<video>` 元素交替（A 播放时 B 预加载下一分支），避免切换黑帧；或单元素 + `preload="auto"` 预热候选片段。
- **事件驱动**：`ended` → 触发跳转；`timeupdate` → 驱动限时选择窗口与字幕；`waiting`/`stalled` → 显示缓冲态；`error` → 走降级（静帧 + 文字）。
- **首帧与 poster**：每个节点配 poster 图，避免加载期白/黑屏。
- **跳过与回看**：允许跳过已看片段（配合存档记录 seen 节点）、结局回看、章节选择。
- **字幕**：内嵌 `<track>` 还是自绘字幕层；中文字体与可读性（CCG 只在 Godot/Unity 语境提过 CJK tofu 问题，Web 侧对应的是**不要依赖用户机器上不存在的字体**、字号与描边）。
- **横竖屏**：影视素材有固定宽高比，需要明确竖屏优先还是双向适配，以及 `object-fit` 策略（不许拉伸——CCG 步骤 7 的「不拉伸位图」在这里对应「不拉伸画面」）。

### 5.2 分支跳转数据结构（零覆盖）

CCG 有「关卡变化」「进程」概念，但没有任何叙事图结构。需要新定义并写进 skill 的 reference：

```jsonc
{
  "meta": { "title": "", "start": "node_01", "orientation": "portrait", "version": 1 },
  "vars": { "trust": 0, "has_key": false },
  "nodes": {
    "node_01": {
      "type": "clip",                    // clip | choice | check | ending
      "media": "assets/video/n01.mp4",   // 本地相对路径
      "poster": "assets/image/n01.jpg",
      "subtitle": [ { "t": 0.0, "text": "" } ],
      "on_end": "node_02",               // 播完自动跳
      "choices": [                       // 可选：覆盖层选项
        { "label": "推门进去", "to": "node_03", "set": { "trust": "+1" }, "requires": { "has_key": true } }
      ],
      "timer": { "seconds": 5, "default_to": "node_04" },  // 限时选择
      "mechanic": { "kind": "qte", "config": {} }          // 自定义玩法挂载点
    },
    "ending_good": { "type": "ending", "id": "E1", "title": "", "media": "" }
  }
}
```

配套必须写清的规则：
- 节点 ID 稳定、不复用；跳转只能指向已存在的 ID
- 条件判定（`requires`）与副作用（`set`）分开，副作用只在跳转发生时施加一次
- 存档结构：当前节点 + 变量快照 + 已看节点集合 + 已解锁结局集合
- **图的静态校验**：孤儿节点、死端、指向不存在 ID、结局不可达——这四项应能被一段小脚本自动检查，直接喂给 §4.4 的验收步骤 3

### 5.3 从平台拉素材的流程（零覆盖）

CCG 是「云沙箱内生成，返回路径就在工作区里」，一步到位。Yoroll 是「远端生成 → 本地工程」，中间隔着网络和鉴权，必须新写：

1. `list_media_assets`（或等价工具）列出该账号/项目下已有素材 —— **先复用再生成**，这是省积分的第一原则，CCG 完全没有这个概念（它每次都新生成）
2. 生成类调用返回 operation ID → `get_operation` 有界退避轮询 → 拿到 `media_asset_id` 与 URL
3. **持久 ID 优先于临时 URL**（`yoroll-plugin-basics` 已明确：`Prefer a durable media_asset_id over a temporary provider URL`）
4. **下载落地**：把素材抓到 `assets/video|image|audio/`，确定性命名（如 `n01_lobby.mp4`），因为 `upload-game` 需要自包含产物，且临时 URL 会过期
5. 更新 `assets/media-manifest.json`：`media_asset_id` ↔ `local_path` ↔ `used_by_node` 三向绑定
6. 代码只引用本地相对路径；**任何残留的远程 URL 在验收阶段算 blocker**
7. 断点续传/重跑幂等：manifest 里已有且本地文件存在的条目跳过，不重复下载也不重复生成

### 5.4 其他缺口

| 缺口 | 说明 |
|---|---|
| **`upload-game` 发布契约** | 目录结构要求、入口文件名、体积上限、是否允许子目录、返回值形态——本仓库里查不到任何资料，**必须先向平台侧确认**再写进 skill。这是整个改造的最大未知项 |
| **积分预算与确认** | 视频生成量大，需要「预估 → 确认 → 样片 → 批量」的流程。CCG 的「静默吞配额失败」策略必须反向改写 |
| **素材复用优先** | CCG 每次新生成；Yoroll 应先查 `list_media_assets` |
| **与 Yoroll 项目的关系** | 用户在平台上可能已有一个影游 project（`get_story` / `get_characters` / `get_plot_outline` / `get_scenes`）。本地自定义小游戏是**从零写**还是**基于已有 project 的剧本导出**？两条路径的 skill 措辞完全不同，需要产品侧定调 |
| **内容合规** | 影视素材涉及肖像/版权/敏感内容，发布前应有一句合规提示。CCG 无 |
| **本地预览手段** | CCG 有 `godot_local_preview` / `unity_local_preview` 这类一键预览；本地形态需要明确「起一个静态 server + 打开浏览器 + 截图核对」的标准做法，否则验收步骤「读真实渲染截图」落不了地 |

---

## 6. 落地顺序建议

1. **先确认三个未知**：`upload-game` 的产物契约、`list_media_assets` 的真实工具名与返回结构、本地小游戏与平台影游 project 的关系。这三项不定，skill 写了也要返工。
2. **先写模板再写 skill**（§4.5）：`index.html` + `engine.js` + `player.js` + `story.example.json` 跑通一个两分支两结局的最小 demo。有了可跑的骨架，四个 skill 的正文才有具体的东西可指。
3. 按 design → implementation → media → delivery 顺序写 skill，每个都从对应 CCG 原件的「可保留部分」（§3）起手，逐条替换 §2 的依赖。
4. 每个 skill 补 `agents/openai.yaml` 的 `dependencies.tools`（§4.6）。
5. 用同一个 demo 走一遍全流程做冒烟，重点验移动端自动播放与 `upload-game` 产物自包含性。
