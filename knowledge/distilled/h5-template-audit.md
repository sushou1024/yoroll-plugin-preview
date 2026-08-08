# CCG 仓库 H5GameAI 子系统审计报告——面向"影视小游戏骨架模板"复用评估

调研对象：本机 `/Users/ennio/xxx/CCG`（`test` 分支，只读调研，未执行任何 git 命令，未修改仓库文件）
调研重点：`H5GameAI/` 目录，兼顾仓库根目录 `agent-skills/`、`backend/`、`game-template/`、`game-template-playable/`
目标读者：yoroll-plugin（影视互动小游戏平台）的工程师 / 产品经理，用于决策是否/如何复用 CCG 的 H5 游戏骨架

---

## 结论摘要

- **`H5GameAI/game-template/`（Phaser + Three.js 双引擎骨架）本身对"影视小游戏"的直接复用度：中低**。它是纯 CDN 无构建的单页游戏壳，提供了移动端适配、错误上报、`Intro.play()` 全屏视频叠层这几块正好命中我们需求的基建，但**没有剧情分支数据结构、没有玩法插槽接口**，卡牌/射击/塔防导向明显。
- **`H5GameAI/templates/rpg/`（不在 `game-template/` 下，是一个独立目录）复用度：高，是本次调研最有价值的发现**。它内置了一套完整的、题材无关的"剧情/过场运行器"`js/engine/story.js`：数据驱动的 steps（对话页/幻灯图页/**全屏视频页**/**分支选择页**/发奖旗标/跳转标签），并且 `js/platform.js` 的 `playVideo()` 已经实现了"视频最后一帧冻结 + 在视频实际显示区域（而非整个屏幕，避免黑边遮挡）上叠加选择按钮"的**成品级"互动影像"渲染逻辑**——这正是我们要的"全屏视频 + 剧情分支选择 UI"的现成参考实现，建议作为设计蓝本重点复用（架构/数据契约层面，而非直接拷贝其 Canvas 渲染代码）。
- **`H5GameAI/prompts/system_prompt.md` 与 `agent-skills/ccg-h5-implementation/SKILL.md` 是两份不同粒度、但同一套体系下的文档，不是重复拷贝**：`SKILL.md` 是 32 行的"Claude/Codex 技能触发器"（写进 `.claude/skills` 目录，告诉编码 Agent 遇到 H5 工作区该怎么做），`system_prompt.md` 是 702 行的完整产品级系统提示词（面向终端用户对话的 H5GameAI 产品本身）。两者共享同一套术语（`CCG.md`、`Fit/Juice/SFX/Intro`、`select_ui_kit`/`materialize_ui_kit`、`ONLINE.md`），是"精简技能触发器 + 完整业务系统提示词"的分层关系。
- **部署产物形态已找到明确证据：不是 zip，也没有 manifest.json 硬性要求**。CCG 自己的发布流程（`backend/src/server/publishedGames.ts`）把会话工作区目录**原样整树上传为静态文件**（S3 逐文件 PutObject，或本地模式下直接由 `/play/<session-id>/` 路由代理目录），唯一的硬性结构要求是**根目录必须有可直接加载的 `index.html`**。但这是 CCG 内部"生成会话 → 发布"流程，**不是一个面向外部、允许上传"已经做好的 H5 游戏包"的通用 upload-game API**，也没有找到图标尺寸等格式规范，这一点在第 5 节详细说明。
- **仓库根目录的 `game-template/` 与 `game-template-playable/` 与 H5GameAI 完全无关**：两者都是 Godot 引擎项目（含 `project.godot`、`.godot/` 编译缓存），服务于 CCG 的另一条产品线（`ccg-godot-implementation` 技能），与 H5GameAI 的 Phaser/Three.js 技术栈没有代码或文档层面的交叉引用（仅在 `H5GameAI/start-backend.sh` 里出现过一次同名但语义不同的 `game-template/phaser` 路径变量，纯属巧合命名，不构成关联）。报告后续不再涉及这两个目录。

---

## 1. `H5GameAI/game-template/`：技术栈与目录结构

### 1.1 目录树（完整，仅两个子目录，无嵌套）

```
H5GameAI/game-template/
├── phaser/                     # 2D 赛道（默认赛道，CDN 引入 Phaser 3）
│   ├── index.html              # 入口：CDN <script> 引入，无构建
│   ├── game.js                 # 游戏逻辑占位页（"生成中…"，Agent 会整体覆盖）
│   ├── fit.js                  # 等比缩放 + 9-slice 助手（window.Fit）
│   ├── juice.js                # 1073 行，手感特效库（window.Juice）
│   ├── sfx.js                  # 零资源 WebAudio 音效库（window.SFX）
│   ├── vfx.js                  # 补充特效
│   ├── intro.js                # 111 行，开场/过场全屏视频叠层（window.Intro）⭐核心可复用件
│   ├── character.js            # 角色相关工具
│   ├── ccg-ui-editor.js        # 564 行，可视化 UI 调整（保存 DOM/Phaser 位置，预览器专用）
│   ├── online.js / lockstep.js / socket.io.min.js  # 联机对战运行时（YorollOnline）
│   ├── CCG.md                  # 该轨道的项目规范/Agent 编码约定
│   └── ONLINE.md               # 联机接入协议文档
└── three/                      # 3D 赛道（Three.js，ES module + importmap，同样无构建）
    ├── index.html               # importmap 引入 three@0.160.0（jsdelivr CDN）
    ├── game.js                  # 507 行，示例"第三人称收集跑酷"玩法
    └── character.js / CCG.md
```

**没有 `package.json`、`vite.config.*`、`webpack.config.*`、`tsconfig.json`**——在整个 `H5GameAI/` 目录下用 `find` 全文搜索均无结果。确认技术栈：

| 赛道 | 引擎 | 引入方式 | 构建 |
|---|---|---|---|
| phaser/ | Phaser 3 | `<script src="https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js">` | 无，纯静态文件直接运行 |
| three/ | Three.js 0.160.0 | `<script type="importmap">` 指向 jsdelivr ESM | 无，`type="module"` 原生浏览器加载 |

### 1.2 关键文件解读

**`phaser/index.html`**（`/Users/ennio/xxx/CCG/H5GameAI/game-template/phaser/index.html`）：
- viewport 锁定 `user-scalable=no`，`html,body{width:100%;height:100%;overflow:hidden}`，`#game{width:100vw;height:100vh}` —— 典型的"铺满 iframe/移动端全屏"写法，**可直接复用**。
- 脚本加载顺序固定：`juice.js → sfx.js → fit.js → intro.js → socket.io/online/lockstep → game.js → ccg-ui-editor.js`，`game.js` 是"业务代码唯一入口"，其余都是基建全局对象（`window.Juice/SFX/Fit/Intro`）。
- 内置一段"幽灵遮罩点击拦截自愈"脚本（连续点击同一个全屏透明无内容元素两次以上会自动解除其 `pointer-events`），用于防止弹层/遮罩关闭不彻底导致整页锁死——**这是一个值得直接搬过去的鲁棒性 trick**。
- 顶部有 `postMessage({type:'h5game-error',...})` 的运行时错误上报，用于父窗口（预览容器）捕获——如果 yoroll-plugin 平台也走 iframe 嵌入 + 编辑器预览的模式，这段可直接复用。

**`phaser/fit.js`**：`Fit.contain/cover/height/width/text/label/panel/icon`，一套等比缩放与 9-slice 面板工具，解决"生成式美术拉伸变形"问题。**移动端适配可直接复用**（与游戏引擎无关的纯计算逻辑，稍改可脱离 Phaser 用于 DOM）。

**`phaser/intro.js`**（详见 1.3）：全屏开场视频播放器，是本报告后续第 4 节评估的关键素材。

**`phaser/CCG.md`**（`/Users/ennio/xxx/CCG/H5GameAI/game-template/phaser/CCG.md`）：这是"项目规则文件"，规定了目录职责（`index.html` 基建不能改，`game.js` 自由编辑）、必须使用的全局助手（`Fit.*`/`Juice.*`/`SFX.*`）、开场视频接入写法（`startGame(); if (videoUrl) Intro.play(videoUrl);`）、24 项质量验收清单等。这是喂给编码 Agent 的"仓库内 README"，与 `agent-skills/ccg-h5-implementation/SKILL.md` 第 1 条"Read `CCG.md`"直接对应。

**`three/index.html` / `three/game.js`**：`game.js` 是一个约 500 行的示例玩法（第三人称收集跑酷），程序化几何体、无外部模型依赖。作为"3D 骨架"参考价值有限（我们的影视小游戏大概率不需要 3D 场景图）。

### 1.3 `intro.js`——全屏视频叠层（与我们的"全屏视频播放"需求高度相关）

`/Users/ennio/xxx/CCG/H5GameAI/game-template/phaser/intro.js` 核心实现（111 行）：

```js
video.style.cssText =
  'max-width:100%;max-height:100%;width:auto;height:auto;' +
  'object-fit:contain;background:#000;display:block;';
...
var tryPlay = function (muted) {
  video.muted = muted;
  var p = video.play && video.play();
  if (p && p.catch) p.catch(function () { if (!muted) tryPlay(true); });  // 移动端自动播放策略兜底
};
```

它解决的正是移动端 H5 视频播放的三个经典坑：
1. **移动端浏览器阻止带声自动播放** → 先尝试有声播放，失败自动降级静音重试。
2. **竖屏视频被横屏容器裁切/拉伸** → 强制 `object-fit:contain`，保持原始比例，宁可留黑边。
3. **视频加载失败/超时把玩家卡在黑屏** → 两道 watchdog（`readyState<1` 8 秒兜底、`loadedmetadata` 后按时长兜底）+ 跳过按钮，确保 `onDone()` 一定会被调用。

`system_prompt.md` 第 545-580 行进一步规定了视频比例规则（竖屏游戏出 `9:16`、横屏出 `16:9`，绝不允许错配）、首帧必须用游戏内已有美术生成（保证视觉一致）等约束，这些是产品经验沉淀，同样值得 yoroll-plugin 参考。

**但要注意**：`intro.js` 只是"播放一段视频、结束后回调"的**单向播放器**，不支持"视频过程中弹出选择、根据选择走不同分支"——这个能力在 `templates/rpg/` 里才有（见第 4 节）。

---

## 2. `prompts/` 与 `agent-skills/ccg-h5-implementation`：关系澄清

### 2.1 两份文档

| 文件 | 行数 | 定位 |
|---|---|---|
| `/Users/ennio/xxx/CCG/H5GameAI/prompts/system_prompt.md` | 702 行 | H5GameAI **产品**的完整系统提示词，直接面向终端用户对话（"你是 H5GameAI——一个用自然语言为用户创作可在浏览器里直接玩的 H5 小游戏的 AI 游戏开发 Agent"）。README 里写明"`prompts/`: H5 system guide copied into each session workspace." |
| `/Users/ennio/xxx/CCG/H5GameAI/prompts/system_prompt.phaser-only.bak.md` | 156 行 | 备份/旧版（`.bak`），仅 Phaser 赛道、无 UI Kit/剧情/联机等后续新增能力，说明产品在迭代，当前版本已远超旧版复杂度。 |
| `/Users/ennio/xxx/CCG/agent-skills/ccg-h5-implementation/SKILL.md` | 32 行 | Claude Code / Codex **技能（Skill）触发器**，YAML frontmatter 声明 `name/description`，供编码 Agent 在检测到"项目根目录有 `index.html` 或 `CCG.md`，且请求涉及 Phaser/Three.js/DOM 游戏"时自动加载。 |

### 2.2 关系判断：**分层引用，不是重复拷贝**

- `SKILL.md` 第 1 条明确写"Read `CCG.md`、`CCG_AGENT_GUIDE.md`、`design.md`"——它自己不复述规则细节，而是指向仓库内的其它文件（`CCG.md` 即 `game-template/phaser/CCG.md` 这类项目规则文件）。
- `SKILL.md` 提到的具体机制（`Fit`/`Juice`/`SFX`/`Intro` 助手、`select_ui_kit`/`materialize_ui_kit` MCP 工具、`ONLINE.md` 联机协议、"delivery validation workflow"）**全部能在 `system_prompt.md` 里找到对应的详细展开**（例如 `system_prompt.md` 第 312-320 行的"UE 信息架构 → 选择并物化 UI Kit"就是 `SKILL.md` 第 6 条的完整版）。
- `DEPLOY-SERVER.md` 印证了两者如何在运行时拼装："runner creates an isolated home/workspace, materializes `AGENTS.md`, `CLAUDE.md`, and the **canonical CCG skills**"——即 `agent-skills/ccg-h5-implementation/` 这类技能会被物化进每个生成会话的 Agent 运行环境（`.claude/` 或 `.codex/` 目录），而 `H5GameAI/prompts/system_prompt.md` 是产品对话侧单独维护、"copied into each session workspace"的另一份提示词。二者是**同一套业务规则的两个消费入口**（一个给编码 CLI 的技能系统用，一个给对话式产品 Agent 用），内容上互相印证、不冲突，不是同一份文件的两份拷贝。
- 另有姊妹技能 `agent-skills/ccg-delivery-validation/SKILL.md`，是"生成完之后怎么验收"的技能（校验 `index.html`、`validate_game_ui`、胜负/重玩路径等），与 `system_prompt.md` 第⑥步"自检收尾"对应。

**对 yoroll-plugin 的启示**：如果我们要做类似的"AI 生成影视小游戏"Agent 产品，这种"仓库内规则文件（CCG.md/ONLINE.md）+ 技能触发器（SKILL.md 指向规则文件）+ 完整系统提示词（对话侧）"三层结构是一个值得借鉴的工程模式，而不需要把所有规则都塞进一份提示词。

---

## 3. `asset-library/`、`library/`、`templates/`、`ui-kits/` 盘点

### 3.1 `asset-library/`——通用素材库（不是成品游戏）

```
H5GameAI/asset-library/
├── 2d/        # 像素/卡通图集，如 1-bit-pack、1-bit-platformer-pack（tile_0000.png ... 逐格切图）
├── 3d/
├── audio/
├── fonts/
└── manifest.json   # 5.1MB，素材索引清单
```
内容是**通用美术/音频素材包**（tileset、精灵图集等），供 `generate_game_image` 等 MCP 工具或模板拼装时引用，**不含任何影视/视频类素材**，对"影视小游戏"没有直接内容价值，只是证明了该产品有一套"素材清单化管理"的做法（`manifest.json` 索引 + 分类目录），这个组织方式本身可以参考。

### 3.2 `library/`——用户生成游戏的存档库（少量样本，不是模板库）

```
H5GameAI/library/
├── card-battler/{sessionId}/  → game.js + meta.json
├── three-3d/{sessionId}/       → game.js + index.html + meta.json
└── misc/{sessionId}/           → game.js + index.html + meta.json
```
抽样读取的 3 个样本 `meta.json`：
- card-battler 样本：`"request": "做一个 2D 足球经理小游戏..."`（注意 genre 标签是 card-battler 但实际是足球经理，说明分类是粗粒度的）
- three-3d 样本：`"request": "做一个3D第一人称游戏"`
- misc 样本：`"request": "做一个简单的接金币小游戏"`

这些是**真实用户请求生成出的成品游戏留档**，样本量很小（每类 1-2 个），且都是"输入一句话 → 单文件 game.js"的产物，**没有一个是剧情/影视类**，作为"影视小游戏参考成品"价值有限，主要价值是印证 `meta.json` 记录了 `request/genre/isModule/size/savedAt` 这套轻量元数据格式。

### 3.3 `templates/`——**这是产品的"赛道模板库"，与 `game-template/` 是完全不同的两个概念**

```
H5GameAI/templates/
├── car-racing-3d/   # README.md 明确标注"priority production seed for racing-game requests"
├── card-battler/
├── fighting/
├── fish/
├── flyer-3d/ flyer-3d-lite/
├── match3/
├── myth-survivor/ myth-survivor-3d/
├── platformer/
├── pool/
├── puzzle2048/
├── rpg/              ⭐ 详见第 4 节，含完整剧情/分支/视频运行器
├── runner/
├── shooter/
├── systems/
├── three-3d/
├── tower-defense/
├── trojan-siege/ trojan-siege-3d/
```
`H5GameAI/README.md` 原文："`templates/`, `ui-kits/`, `asset-library/`: product resources **exposed through the CCG MCP server**."——即这些不是像 `game-template/` 那样在会话开始时整体拷贝进工作区的"种子"，而是**运行时按需通过 MCP 工具（如 `select_ui_kit`/某个 template 选择工具）取用的资源库**，`system_prompt.md` 里也提到"赛道A/B/C/R"的判断逻辑会决定用哪套模板。

**关键结论：`game-template/` 只覆盖赛道 A（Phaser 动作类）和赛道 C（Three.js 3D 类）这两个最基础的空壳；赛道 B（DOM+CSS 系统类，无固定模板文件，system_prompt 里直接给了 CSS 骨架片段）和赛道 R（RPG，`templates/rpg/`）分别在别处定义。** 如果只看 `H5GameAI/game-template/` 会完全错过 `templates/rpg/` 这个最相关的剧情引擎——这是本次调研任务特别提醒要核实"两个 template 目录是否一回事"的价值所在，确认**不是一回事**，且 `templates/rpg/` 的内容对本次目标（影视小游戏）比 `game-template/` 更关键。

### 3.4 `ui-kits/`——九宫格 UI 皮肤库（纯视觉组件，非交互逻辑）

抽样目录：`anime-fantasy/`、`anime-tech/`、`cartoon-paper/`、`casual-pop/`、`crimson-scroll/`、`cyber-neon/`、`island-bubble/` 等（每套一个 `kit.json` + `assets/*.png`）。

以 `anime-fantasy/kit.json` 为例（`/Users/ennio/xxx/CCG/H5GameAI/ui-kits/anime-fantasy/kit.json`）：
```json
{
  "id": "anime-fantasy",
  "palette": { "surface": "#1d2140", "text": "#ffffff", "accent": "#45cfff", "secondary": "#8e63ff", "danger": "#ec557e" },
  "components": {
    "button.primary": { "kind": "nine-slice", "asset": "assets/button-primary.png",
      "nineSlice": {"left":34,"top":20,"right":34,"bottom":20}, "safeInsets": {...}, "minSize": {...}, "defaultSize": {...} },
    ...
  }
}
```
组件覆盖范围（跨样本汇总）：`button.primary/secondary/close/danger/back`、`panel.main/popup`、`progress.track/fill`、`checkbox.on/off`、`tab.normal/selected`、`input.normal`、`slot.action`。**没有 video/字幕/选择分支相关组件**——UI Kit 纯粹解决"按钮/面板/进度条不被拉伸变形"的美术问题，与本次核心诉求（视频播放、分支叙事）无关，但**这套"nine-slice + palette + 组件安全区"的数据格式本身值得直接借鉴**，用来做"影视小游戏皮肤系统"（例如不同剧集配不同视觉主题）。

---

## 4. 关键评估：能否复用为"影视小游戏骨架模板"

需求：**全屏视频播放 + 剧情分支选择 UI + 自定义玩法插槽 + 移动端适配**。

### 4.1 可直接复用/改造复用的部分

| 来源文件 | 机制 | 复用方式 |
|---|---|---|
| `H5GameAI/game-template/phaser/index.html` | 无构建、CDN 引入、`viewport` 锁定、`overflow:hidden` 全屏铺满、幽灵遮罩自愈脚本、`postMessage` 错误上报 | **直接抄整个 `<head>`/基建脚本段**，作为我们骨架的 `index.html` 起点 |
| `H5GameAI/game-template/phaser/fit.js` | `Fit.contain/cover` 等比缩放算法（纯函数，不依赖 Phaser 对象特有 API，可轻改用于 DOM `<img>`/`<video>`） | 移植为 DOM 版 `fitContain(el, boxW, boxH)` 工具函数，用于视频/立绘容器自适应 |
| `H5GameAI/game-template/phaser/intro.js` | 全屏视频播放：`object-fit:contain`、有声/静音自动播放降级、双重 watchdog 防卡死、跳过按钮 | **直接作为我们"全屏视频组件"的第一版实现**（去掉 Phaser 依赖后就是纯 DOM+JS），移动端自动播放兜底逻辑价值最高 |
| `H5GameAI/templates/rpg/js/engine/story.js` | **数据驱动的剧情/过场运行器**：`steps` 数组支持 `say`(对话)/`slide`(幻灯图)/`video`(视频)/`choice`(分支选择)/`flag`&`set`&`add`(状态变量)/`goto`(标签跳转)/`wait`(停顿)/`end` | **架构直接搬**：这就是我们"剧情分支数据结构"的现成设计，`ST.choose(k)` 的分支选择处理（选项可设 flag/累加数值/toast 提示/goto 跳转）几乎就是"影视互动剧情"的最小可行数据模型 |
| `H5GameAI/templates/rpg/js/platform.js` 的 `playVideo()` | 全屏 `<video>` 叠层（`position:fixed;inset:0;object-fit:contain;z-index:50`），支持 `skippable`、`holdOnEnd`（**播完/跳过后冻结当前帧供选择 UI 叠加**） | `holdOnEnd` 这个细节非常关键：它是为了"视频最后一帧 + 选择弹窗"这个典型互动影像场景专门设计的，**直接复用这个交互模式** |
| `H5GameAI/templates/rpg/js/engine/screens.js` 的 `sceneSafeRect()` + `drawChoiceOverlay()` | 选择按钮的渲染区域**按视频实际显示的矩形（扣除 letterbox 黑边）计算**，而不是简单铺满整个屏幕 | 这是一个容易被忽略但很重要的细节：**分支选择按钮必须放在视频真实画面区域内，不能放进黑边**——直接搬这个计算逻辑（`Math.min(视口宽/视频宽, 视口高/视频高)` 算出实际显示矩形） |
| `H5GameAI/game-template/phaser/CCG.md`、`H5GameAI/templates/rpg/CCG.md` | "分层架构契约"文档模式（platform → ui → engine → content，引擎层禁止硬编码题材内容，内容全部进 `window.GAME` 注册表） | 复用这种"引擎/内容分离"的项目治理约定，写成我们自己的 `CCG.md`/`AGENT.md` |
| `system_prompt.md` 第 392-404 行 | 移动端优先 CSS 骨架：`max-width:520px` 居中列、`env(safe-area-inset-bottom)`、按钮 `min-height:44px` | 直接抄这段作为容器基线样式 |
| `H5GameAI/ui-kits/*/kit.json` 数据格式 | nine-slice + palette + 组件安全区的 JSON schema | 复用格式设计一套"剧集皮肤"配置，而非该素材本身 |

### 4.2 完全没有、需要从零写的部分

1. **视频驱动的分支叙事编排器（业务层）**：`templates/rpg/story.js` 提供的是**通用运行器**，但它的分支选择仍然是"文字按钮 + Canvas 绘制"，且强耦合 RPG 引擎的 `state.flags`/`Engine.save()` 存档体系。我们需要针对"影视小游戏"重写一套**DOM 版**的：
   - 分支节点数据结构（视频片段 id/URL、每个节点的选项列表、选项对应的下一节点、选项对影片剧情变量的影响）
   - 分支选择的 DOM UI 组件（而不是 Canvas 绘制），要能叠加在 `<video>` 元素上方且自适应视频实际显示区域（可以照搬 `sceneSafeRect()` 的计算思路，但输出 CSS 定位而不是 canvas 坐标）
   - 剧情图的可视化编辑/校验（原仓库没有编辑器，剧情数据是 Agent 直接手写 JS/JSON）
2. **视频预加载与无缝切段策略**：`intro.js`/`playVideo()` 都是"单段播放"模型，切换到下一段视频时会重新创建 `<video>` 元素、有黑屏间隙。影视小游戏如果要多段视频无缝衔接（尤其是分支后立即接下一段），需要自己做**双 `<video>` 元素预加载+交叉淡入淡出**或 MSE 缓冲策略，仓库内没有这个能力。
3. **"自定义玩法插槽"接口**：这是我们独有的需求，CCG 侧完全没有对应概念——它们的"赛道"是互斥选择（一个游戏要么是 Phaser 要么是 DOM 要么是 RPG 引擎），没有"在剧情节点里插入一个可替换的小游戏组件（QTE/点击/拖拽/小游戏）"这种可插拔机制。需要我们自己设计插槽协议（例如：节点类型 `minigame`，指定组件名 + 超时/成功/失败分别对应的下一节点）。
4. **剧情分支的存档/进度持久化格式**：`templates/rpg` 用 `js/engine/save.js` + `localStorage`，绑定的是 RPG 的 `state.flags` 结构，不能直接套用；需要为"看到第几节点、选了哪些分支、影片进度"设计单独的存档 schema。
5. **视频素材与剧情节点的关联/审核流程**：仓库里视频是 AI 实时生成（`generate_game_video` 工具），我们大概率是"预先剪辑好的影视素材 + 人工/半自动打点分支"，工作流完全不同，只能借鉴数据结构，不能复用生成侧的调用逻辑。
6. **多结局/剧情图收敛与统计**：`story.js` 的 `goto` 只是简单标签跳转，没有"多个分支汇合到同一节点""统计玩家选择路径做数据分析"的能力，需要自行扩展。

### 4.3 建议的目录结构（影视小游戏骨架模板落地方案）

基于上述"能拿走的机制"+"需要新写的部分"，建议如下结构（沿用 CCG 无构建/纯静态的思路，但换成 DOM 优先、去掉 Phaser/RPG 引擎依赖）：

```
film-game-template/
├── index.html                      # 参考 game-template/phaser/index.html 的 <head> 基建：
│                                    #   viewport 锁定、全屏铺满、幽灵遮罩自愈、postMessage 错误上报
├── CCG.md                          # 项目规则文件（参考 templates/rpg/CCG.md 的分层契约写法）
├── platform.js                     # 平台抽象层（参考 templates/rpg/js/platform.js）：
│                                    #   canvas/DOM 无关的 loadImage/store/onPointer 等，方便未来换容器（小程序/App WebView）
├── player/
│   ├── VideoPlayer.js               # 核心新写：基于 intro.js 的自动播放降级 + watchdog，
│   │                                #   升级为"支持队列/预加载下一段"的播放器类
│   ├── fit.js                       # 直接移植 game-template/phaser/fit.js 的 contain/cover 算法（去 Phaser 依赖）
│   └── safeRect.js                  # 移植 templates/rpg/screens.js 的 sceneSafeRect() 逻辑（video 实际显示矩形计算）
├── story/
│   ├── StoryRunner.js               # 参考 templates/rpg/js/engine/story.js 的 steps/process/choose/goto 状态机，
│   │                                #   改造为 DOM 事件驱动而非 Canvas 帧循环
│   ├── ChoiceOverlay.js             # 新写：DOM 版分支选择浮层组件，定位读取 safeRect.js 的结果
│   ├── schema.md                    # 剧情节点 JSON Schema 文档（video/say/choice/flag/goto/minigame 节点类型）
│   └── save.js                      # 新写：剧情进度/分支路径存档（参考 templates/rpg/js/engine/save.js 的 KV 存档模式）
├── slots/
│   ├── SlotHost.js                  # 新写：玩法插槽宿主容器，负责挂载/卸载/超时/结果回调
│   ├── registry.js                  # 新写：插槽类型注册表（qte/click/drag/quiz/...）
│   └── examples/
│       └── qte-example.js           # 参考 game-template/phaser/juice.js 的反馈手感做一个示例插槽
├── ui-kit/
│   ├── kit.schema.json              # 参考 ui-kits/*/kit.json 的 nine-slice + palette 数据格式
│   └── themes/                      # 每部剧集/题材一套主题（复用格式，不复用素材）
├── content/
│   ├── theme.js                     # 参考 templates/rpg/js/content/theme.js：主题色/字体等题材化配置
│   ├── story-graph.json             # 剧情图数据（节点+分支边，实际内容）
│   └── assets-manifest.json         # 视频/图片素材清单（参考 asset-library/manifest.json 的清单化管理思路）
├── style/
│   └── base.css                     # 移动端优先骨架：max-width:520px、env(safe-area-inset-*)（抄 system_prompt.md 392-404 行）
└── README.md
```

设计要点说明：
- **`player/` + `story/` 两层拆分**是从 `templates/rpg` 学到的最重要经验：视频播放（平台细节，含移动端兼容坑）和剧情状态机（业务逻辑）解耦，story 层只调用 `VideoPlayer` 的抽象接口（play/pause/onEnd/holdLastFrame），不关心具体 `<video>` 标签的兼容性处理。
- **`slots/` 是我们必须新增、CCG 完全没有的一层**，需要单独设计插槽生命周期协议（建议参考游戏行业通用的 "load → start → (pause/resume) → result(success|fail|timeout) → unload"）。
- **保留"无构建/CDN 直跑"这个选型**是否合适需要 yoroll-plugin 自行判断：CCG 选择无构建是因为要**给 AI 编码 Agent 直接写单文件**、且要塞进沙箱/iframe 预览。如果我们的內容生产流程不是"AI 现场写代码"而是"人工配置剧情图 JSON + 少量自定义插槽代码"，引入轻量构建（Vite）反而能获得 TS 类型检查、按剧集分包等好处，不必强行照搬"零构建"这条约束。

---

## 5. 部署产物形态

### 5.1 生成产物本身：静态文件目录，无构建产物

`H5GameAI/game-template/phaser/index.html` 直接引用相对路径 `juice.js`、`fit.js` 等同级文件，`assets/` 子目录放图片音频——**产物就是这一整个目录**，没有打包步骤。

### 5.2 发布/上传流程证据（`backend/src/server/publishedGames.ts`）

关键代码（`/Users/ennio/xxx/CCG/backend/src/server/publishedGames.ts`）：

```ts
async function resolvePublishSource(session: HttpSession): Promise<PublishSource> {
  const h5Root = info.workspaceDir
  const compiledRoot = join(info.workspaceDir, '.ccg', 'web-export')   // Godot 导出产物
  const unityRoot = join(info.workspaceDir, '.ccg', 'unity-webgl')     // Unity WebGL 导出产物
  ...
  for (const { rootDir, kind } of candidates) {
    const indexPath = join(rootDir, 'index.html')
    if (!(await pathExists(indexPath))) continue          // ← 唯一的硬性结构检查：根目录要有 index.html
    ...
  }
  throw new Error('No publishable game artifact found')
}
```

```ts
for await (const filePath of walkFiles(source.rootDir)) {   // 整个目录树递归遍历
  const relativePath = relative(source.rootDir, filePath)...
  await uploadFile(filePath, `${artifactPrefix}/${relativePath}`, bodyOverride)  // 逐文件 S3 PutObject
}
```
- **产物形态：逐文件上传的静态站点目录（S3 前缀 `games/{engineKind}/{ownerHash}/{sessionId}/{publishedAt}/...`），不是 zip、不是单文件 HTML**。
- 唯一结构要求：`index.html` 必须存在于产物根目录且可直接被浏览器加载（无需服务端渲染）。
- `index.html` 会被服务端**注入**：替换/插入 `<title>`，以及 `window.YOROLL_GAME_ID` / `window.YOROLL_ONLINE_ENDPOINT` 两个全局变量（供联机运行时使用）——见 `htmlWithTitle()` 函数。
- 封面图（`cover.png`，`COVER_FILENAME`）是可选文件，存在则一并上传并生成缩略图，用于作品库展示，**不是必需项**。
- `shouldSkipPublishEntry()` 明确列出了**不会**被发布的内部文件白名单：`.ccg/`、`.git/`、`AGENTS.md`、`CLAUDE.md`、`CCG.md`、`CCG_AGENT_GUIDE.md`、`ONLINE.md`、`design.md`、`delivery_report.json` 等——说明这些"给 Agent 看的规则文件"平时就跟游戏代码放在同一个工作区里，发布时才被过滤掉。
- **本地模式**（未配置 S3/Postgres 时）：不上传，直接由后端路由 `/play/<session-id>/` 把会话工作区目录当静态站点代理出去（`publishSessionGameLocally()`）。
- 未配置云存储时的批量迁移方式是 `backend/scripts/package-games.sh`：把整个 `.sessions/` 目录（会话记录 JSON + 每个游戏的工作区文件夹）打成一个 tar.gz，scp 到服务器解压合并——这也印证了"游戏 = 数据（会话工作区），不是编译产物"这个设计取向。

### 5.3 关于"upload-game 接口格式要求"

搜索了 `backend/src/server/routes.ts`（发布相关路由为 `/api/v1/sessions/${sessionId}/publish` 与 `/publish-metadata`）、`DEPLOY-SERVER.md`、`gen.sh`/`serve.sh`/`start-backend.sh`、`backend/scripts/` 下的脚本，以及全仓库对 `upload-game`/`uploadGame`/`upload_game` 关键词的检索：

- **找到的 `/publish` 路由是 CCG 自己"会话生成完 → 一键发布到作品库"的内部流程**，输入是已存在的 `session_id`（关联到服务器本地的会话工作区目录），不接受"外部上传一个现成的 H5 游戏 zip/目录"这种请求体。
- 仓库内的 `uploadStore.ts`（`backend/src/server/routes.ts` 中 `saveUpload/statUpload/resolveUpload`）是**聊天附件上传**（用户发给 Agent 的参考图/文档），与"上传一个完整游戏包"是完全不同的功能，不要混淆。
- **没有找到任何 `manifest.json` 硬性要求、图标尺寸规范，或面向第三方的"提交你自己做好的 H5 游戏"格式文档**。已知的唯一硬性格式要求就是 5.2 节所述的"产物根目录要有可直接加载的 `index.html`"。

**结论（如实说明）：仓库内未找到面向外部项目、允许直接提交一个"已经做好的 H5 游戏包"的通用 upload-game 接口格式规范；现有的 `/publish` 流程是 CCG 自己会话产物的内部发布通道，其隐含的格式要求仅是"根目录 index.html + 相对路径引用资源"。如果 yoroll-plugin 需要对接或参考 CCG 的这套发布机制（例如未来两个产品要共享作品库/发布通道），建议直接向 CCG 平台侧工程团队确认是否计划开放此类接口，而不要基于本次调研去猜测或臆造格式规范。**

---

## 附：目录关系速查表

| 目录 | 是什么 | 与本次目标的关系 |
|---|---|---|
| `H5GameAI/game-template/` | 新会话种子（Phaser+Three 两个空壳） | 基建/移动端适配/视频播放器可复用，剧情/分支为空白 |
| `H5GameAI/templates/` | MCP 按需取用的赛道模板库（含 `rpg/` 等 19 个品类） | `templates/rpg/` 是本次最有价值的发现，其余品类（赛车/卡牌/塔防等）与影视小游戏关系不大 |
| `H5GameAI/library/` | 用户真实生成游戏的少量存档样本 | 参考价值低，样本少且无影视类 |
| `H5GameAI/asset-library/` | 通用像素/贴图/音频素材库 | 无影视相关素材，仅"清单化管理"思路可参考 |
| `H5GameAI/ui-kits/` | 九宫格按钮/面板皮肤包 | 数据格式（nine-slice+palette）可借鉴，内容不可用 |
| `H5GameAI/prompts/` | H5GameAI 产品系统提示词 | 与 `agent-skills/ccg-h5-implementation` 分层引用关系，工程模式可借鉴 |
| `agent-skills/ccg-h5-implementation/` | Claude/Codex 技能触发器 | 同上 |
| `CCG/game-template/`、`CCG/game-template-playable/`（仓库根目录） | **Godot 引擎项目**，与 H5GameAI 无关 | 确认无关，报告不涉及 |
