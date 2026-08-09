---
name: yoroll-h5-film-game
description: Build a zero-build browser interactive film game in the user's local workspace — fullscreen video playback, a branching story graph, custom mechanics slots, and custom UI — with media generated through Yoroll MCP and the finished static build deployed to the platform via MCP. Use only when the user explicitly wants a local web mini film game with custom gameplay or custom interface authored as local web files, or when the user picks 影视小游戏 (mini game) on the creation menu card, i.e. wait_for_creation_intent returns intent=mini_game. Never trigger during the creation of a Yoroll on-platform workflow film game project — those projects generate everything, including UI and QTE gameplay, through platform tools (yoroll-film-game-creation), and mentioning UI or gameplay tweaks there does not mean writing local code.
---

# 自定义影视小游戏

用户在本地写一个**网页影视小游戏**：全屏视频 + 分支剧情 + 自己定义的玩法与界面。
素材通过 Yoroll MCP 生成并下载到本地，成品是一整棵静态目录，经 MCP 部署到平台。
除用户直接描述需求外，创作卡片选择「影视小游戏」（`wait_for_creation_intent` 返回
`intent="mini_game"`）同样进入本 skill。

会话级策略（语言、可见 Yoroll 链接、鉴权、operation 轮询）遵循 `yoroll-plugin-basics`，本 skill 不重复实现。

**触发硬边界**：本 skill 只在两种情况下启用——用户**明确要求**做"自定义玩法/自定义界面
的本地网页影视小游戏"，或创作卡返回 `intent="mini_game"`。**绝不要在平台 workflow
影游项目的创作过程中被触发。** 判定信号：当前语境里存在 workflow 项目（已 `create_project`、
在谈剧本/角色/分镜/出片/发布）就是平台影游线的地盘——此时用户提到"改 UI""换界面风格"
"加个玩法"，指的都是平台工具（`update_ui_config` / `generate_ui` / `set_scene_qte`），
**回到影游线的流程去做，不要开始写本地代码、不要创建任何本地工程文件**。只有用户明确
表示要**另做一个**自定义玩法/界面的本地网页小游戏并确认切换后，才进入本 skill 的流程。

## 与另一条线的分界

Yoroll 有两条互不混用的创作线。本 skill 是**影视小游戏**线；**平台影游**线由
`yoroll-film-game-creation` 承载。一次创作只走一条线，产物形态、生产方式、发布链路完全不同：

| | 平台影游（`yoroll-film-game-creation`） | 影视小游戏（本 skill） |
|---|---|---|
| 生产方式 | 平台 workflow 工具生成一切产物 | Agent 在用户工作区写本地代码工程 |
| 工程骨架 | 无本地文件，全部在平台项目里 | 拷贝 `template/` 骨架到本地 |
| UI | `generate_ui` 生成、`update_ui_config` 调整 | 亲手写 `css/theme.css` + `js/ui/` |
| 玩法互动 | `update_scene` 分支 + `set_scene_qte` | `js/slots/` 自定义玩法插槽 |
| 素材 | workflow 阶段内部生成并自动挂载 | 经 MCP 生成后拉取到本地 `assets/` |
| 发布 | `validate_publish` → `publish_project` | 打包 zip → `deploy_game` |
| 最终产物 | Unity 打包发布的平台作品 | 部署到平台的静态网页 |

**易混场景的正确路由**：

- 影游项目里用户说"换个 UI 风格 / 界面重新做一版" → 平台线的 `update_ui_config` /
  `generate_ui`，**不进入本 skill、不写代码**。
- 影游项目里用户说"这一场加个反应挑战 / 玩法" → 平台线的 `set_scene_qte`，
  不是本 skill 的玩法插槽。
- 用户说"我想要一个界面和玩法完全自己定义的网页小游戏"（或创作卡选了影视小游戏）→
  这才是本 skill：另起本地工程走完整流程，成品经 `deploy_game` 发布为网页，
  **不要**拿平台影游项目的 `publish_project` 来发布它。

## 选中「影视小游戏」后的开场引导

用户从创作卡选了「影视小游戏」但还没说出想法时，**不要直接抛抽象问题**。先用 2–3 句
介绍这个能力：这是**可以自定义玩法和界面的网页影游**——全屏视频 + 分支剧情 + 你想要的
任何玩法（解谜、反应挑战、对抗博弈都行），做完可以直接发布到平台让别人玩。然后引导
用户用一句话说出想法，并给出可直接照抄的句式，例如：

> 用一句话告诉我你想做什么就行，比如"做一个雨夜密室逃脱，玩法要解谜"，
> 或者"做一个末日地铁站求生，选错同伴就要付出代价"。

语言跟随用户，不暴露工具名与内部参数。用户给的想法很简短也照单全收：按「设计先行」
直接开工，常规决策自己定，不追问细节。

## 三条反向纪律（优先级高于本文其余内容）

这套方法论从游戏生成体系改造而来，以下三条与原体系**相反**，冲突时以本节为准：

1. **失败要说、降级要说、积分要报。** 任何素材生成失败、退而求其次的降级、以及实际消耗的
   积分，都必须如实告知用户。禁止静默吞掉失败后继续；禁止在代码没真正引用素材时声称"已接入"；
   禁止编造成功的生成结果。可选素材失败不得阻塞可玩性，但**必须说**。
2. **常规决策自己定，花积分和发布必须确认。** 画幅、色调、字幕字体、节点数量、命名这类可逆且
   不花钱的决策自行拟定，不打断用户；但**每一次消耗积分的生成、以及发布**，都要先用一句自然语言
   复述"要做什么、大概多少量"，取得明确同意。视频是积分大头：先出**一条**样片确认风格与时长，
   再报预计条数请求确认，然后批量。
3. **对本地开发者不隐藏技术细节。** 用户就是在自己电脑上写代码的人，他需要看到文件路径、
   控制台报错、校验结果。照常给路径与报错。只有两件事仍然不说：凭据/token 不写进任何文件或回复，
   一次性 handoff URL 不粘贴到聊天里。最终交付说明用玩家语言描述作品本身。

另有一条与原体系相反的省钱原则：**先复用再生成**。开工前先用 `list_media_assets` 看账号下已有素材，
能复用的绝不重新生成。

## 一、设计先行

先看工作区：有没有 `design.md` / `content/story.js` / `index.html`——有就是续做，先读现状再改；没有就是新建。

写 `design.md`，必须记录这几类内容（缺一项就是设计没做完）：

- **故事前提与主角**：一句话讲清处境与核心悬念。
- **剧情图节点清单与结局清单**：每个节点的片段时长、情绪、承担的叙事功能；结局至少两个。
- **选择点**：每个选择的判定条件与后果。选项必须有真实代价或不确定性，禁止一眼看出对错的伪选择；
  不同分支要呈现**对立情绪**（信任/怀疑、解脱/愧疚），差异不能只是事件差异。失败路径要有叙事原因，
  并在后续节点过程化推进落到不可逆代价，不许"失败＝直接结束"。
- **自定义玩法**：在哪些节点插、插什么品类、成功/失败分别去哪（见第四节）。
- **变量与存档**：哪些变量、在哪改、存档存什么。
- **美术锚点与主题 token**：一张 key image 定死人物与场景视觉，后续所有片段以它为参考；
  主题色写进 `css/theme.css` 的 `:root`。
- **竖屏还是横屏**、以及响应式策略。
- **素材清单与降级**：每条素材的用途、依赖、目标位置、接入点、失败时的兜底。
- **具体验证场景**：现在就写清将来怎么验，**含每条结局的到达路径**。

设计产物即数据，不是散文：`design.md` 写完的同时把 `content/story.js` 的节点骨架搭出来。

### 分支图数据结构

```jsonc
{
  "meta": { "title": "", "start": "n01", "saveKey": "", "version": 1, "orientation": "portrait" },
  "vars": { "trust": 0, "has_key": false },
  "nodes": {
    "n01": {
      "type": "clip",                      // clip | ending
      "media": "video/n01.mp4",            // 本地相对路径
      "poster": "image/n01.jpg",
      "subtitle": [ { "t": 0.4, "text": "" } ],
      "set": {}, "add": {},                // 进入节点时施加一次的副作用
      "on_end": "n02",                     // 播完自动跳
      "prompt": "你怎么做？",
      "choices": [
        { "label": "推门进去", "to": "n03", "add": { "trust": 1 }, "requires": { "has_key": true } }
      ],
      "choice_at": 8.5,                    // 播到第 N 秒就弹选项（默认播完再弹）
      "timer": { "seconds": 5, "default_to": "n04" },
      "mechanic": { "kind": "click", "config": {}, "on": { "success": "n05", "fail": "n06" } }
    },
    "e1": { "type": "ending", "ending": { "id": "E1", "title": "", "text": "" } }
  }
}
```

硬规则（这四条由 `Story.validate()` 静态检查，验收阶段必须跑通）：

1. 节点 ID 稳定、不复用；跳转只能指向已存在的 ID。
2. `requires`（判定）与 `set`/`add`（副作用）分开写；副作用只在跳转真正发生时施加一次。
3. 每个 `clip` 节点必须有出口（`on_end` / `choices` / `mechanic.on`），否则是死端。
4. 每个结局至少有一条从 `meta.start` 出发的可达路径；`media` 一律相对路径，不许写远端 URL。

范围收敛：脆弱的炫技换成低风险等价物。**界面质量是交付要求，不是时间紧就能砍的润色**——
用 `css/theme.css` 的主题 token 与组件样式，交付一堆没样式的灰方块按钮等于交付失败。

## 二、从模板起步

把本 skill 的 `template/` 整个拷进用户工作区作为起点（不要从空白 HTML 手搓）：

```
index.html            根入口，双击即可运行
css/theme.css         主题 token + 组件样式（换剧集只改 :root）
js/platform.js        平台层：双 <video> 轮换播放、预加载、自动播放降级、存储、安全矩形
js/engine/story.js    分支运行器：节点图遍历、变量、条件、限时、图静态校验
js/engine/save.js     进度存档 + 结局解锁表
js/ui/render.js       DOM 渲染：视频舞台、字幕、选项浮层、玩法宿主、结局面板
js/slots/registry.js  自定义玩法插槽宿主 + 两个示例插槽
content/story.js      **唯一需要为每部作品重写的文件**
assets/video|image|audio/   素材落地目录
PROVENANCE.md         模板来源与改造记录（不随发布产物上传）
```

改造顺序：先重写 `content/story.js`（剧情图），再改 `css/theme.css` 的 token（视觉），
最后才动 `js/`（只有模板表达不了的机制才扩引擎）。

**零构建产物约束（发布的前提，不可协商）**：根 `index.html` 直接可打开运行；全部引用为相对路径；
不引入打包器、构建步骤、别处的入口。本地预览可以起一个只读静态 server（视频跨域与自动播放策略
在 `file://` 下受限），但**产物本身不得依赖它**。

架构三层分离，不许把剧情写死在渲染代码里：`content/story.js`（数据）/ `js/engine/`（图遍历+变量+存档）/
`js/ui/`（播放器+覆盖层）。跳转必须是「引擎改状态 → 渲染响应」的单向流。

## 三、素材获取流程

工具名以 Yoroll MCP 实际 `tools/list` 为准，本文所列已对照 MCP 服务端文档核实。

1. **先查复用**：`list_media_assets` 列出账号下已有素材，`get_media_asset` 取详情。能复用就不生成。
2. **先立锚点**：`generate_image` 出角色/场景 key image，后续所有片段以它为参考，保证跨节点一致性。
3. **出样片**：`generate_video` 先出**一条**，与用户确认风格、时长、画幅，再谈批量。
4. **批量**：不同节点的独立片段可并行提交；有依赖边的（key image → 首帧 → 视频）串行。
5. **异步 operation 纪律**：业务调用返回 operation 对象后即视为**已受理**，用 `get_operation`
   有界退避轮询到 terminal state，**绝不重复提交同一个业务调用**。相同重试复用同一个 `client_request_id`。
6. **落地到本地**：优先记录持久 `media_asset_id`（临时供应商 URL 会过期），把文件下载到
   `assets/video|image|audio/`，用确定性文件名（如 `n01_lobby.mp4`）。
7. **代码只引用本地相对路径**。任何残留的远程 URL 在验收阶段算 blocker。
8. **记账**：在 `assets/media-manifest.json` 里维护 `media_asset_id ↔ local_path ↔ used_by_node`
   三向绑定，外加 `source_prompt` / `duration` / `status` / `fallback`。已在 manifest 且本地文件存在的
   条目跳过，不重复下载也不重复生成（断点续跑幂等）。
9. **原样消费返回值**：不猜扩展名、不重命名远程 URL、代码没引用前不许说"已接入"。
10. 素材一律走 Yoroll MCP，不要 curl 第三方生成 API，不要把外部图床 URL 直接写进游戏。
11. 配音与背景音乐不在本插件的推荐路径里，不主动提议；用户自备的本地音频文件照常使用。

## 四、自定义玩法插槽

玩法是"挂在节点上的可替换组件"，不是硬编码分支。插槽协议固定四步：
`register(kind, factory)` → `factory(config, host, done)` → `done('success'|'fail'|'timeout')` → 引擎按
`mechanic.on[result]` 决定去向。宿主容器已被定位到视频真实显示矩形内，插槽只管往里塞 DOM。

品类、参数字段与默认值查 `references/qte-reference.md`（18 种玩法总表）。选品类的原则：

- **玩法与情绪必须匹配**，选错品类就是设计错误。紧张危机用短平快反应类（`click`/`shoot2`/`longpress`/
  `swipe`）；情感张力用 `balance`；悬疑解谜用 `insight` → `puzzle` → `insight_scratch` 这条链；
  对抗博弈用棋类；轻松支线用 `whack_mole`/`tileslot`。
- **密度服从叙事压力**：每 2–4 个节点插一个，长耗时玩法（`puzzle`/`gomoku`/`tileslot`）一章一次为宜。
  每个节点都插 QTE 是典型坏设计。
- **难度递进**：同一玩法复用时用参数体现爬坡，不要机械重复同一份配置。
- **失败后果与玩法强度相称**：轻松向玩法失败给温和反馈，别让它承载核心抉择。
- **三段式节奏**：铺垫（前几个节点建立具体威胁）→ 触发（玩法所在节点）→ 后果（**下一个节点的开头
  必须体现即时可见的状态改变**）。玩家的动作要在下一秒被看见，否则互动白设计。

自定义 UI 同理：新增浮层用 `css/theme.css` 的组件类，保持与主题 token 一致，不要另起一套视觉。

## 五、本地预览与验收

验的必须是**发布真正会上传的那份产物**，不是替身 demo，也不是只读源码。
起一个静态 server 打开根 `index.html`，在代表性桌面尺寸与移动尺寸各走一遍，**读真实渲染截图判断界面**，
不要用实现摘要代替。

必查项：

1. **图校验**：`Story.validate()` 必须 `ok: true`——无孤儿节点、无死端、无指向不存在 ID、无不可达结局、
   无残留远端 URL。控制台同时不能有其它报错。
2. **分支覆盖**：每个结局至少实际走通一次；每个条件分支的每个方向都要触发一次。
3. **播放**：每段片段能播、能自然结束并跳转；跳过行为正确；限时选择超时走默认分支；连播不留黑帧。
4. **移动端**：`playsinline` 生效不被全屏劫持；静音自动播放可用；首次手势（开始按钮）能解锁声音；
   竖屏横屏文字都可读；控件可点（最小 44px）。
5. **弱网与失败路径**：慢加载有加载态；片段 404 或 `error` 时走文字兜底而不是白屏。
6. **存档**：进度持久化、重开能恢复、重玩清档、结局解锁计数正确、初始化幂等。
7. **画面**：`object-fit: contain`，不许拉伸；选项浮层落在画面内，不落进黑边。
8. **素材**：每条已接受的素材都被某个节点可见地使用；总体积与单文件体积在平台上限内。

**blocker 清单**（影视语境）：白屏、控制台报错、失效控件、够不到的浮层、缺素材、拉伸画面、
截断文字、坏存档、**触发不了的结局**、**指向过期远程 URL 的片段**、移动端无法起播、
片段加载失败后卡死。

修完每个 blocker 并重跑受影响的场景。**不许用勾选清单代替执行证据**。
把结果写进 `delivery_report.json`：被测产物、走过的路径、每条结局的到达证据、素材状态、
已知非阻塞降级、blocker 列表、最终 `pass`/`fail`。只有 pass 才能进入发布。

## 六、发布到平台

**产物形态**：整棵静态目录，根目录必须有可直接加载的 `index.html`，全相对路径引用。
打包前删掉只给 agent 看的文件（`design.md`、`delivery_report.json`、`PROVENANCE.md`、
`assets/media-manifest.json`、任何 `tools/`、`scripts/`、`.env`）。

**发布走 MCP 全自动完成，用户不需要离开对话。** 第五节验收 `pass` 后按以下顺序执行：

1. **打包**：把发布目录压成一个 zip（结构与校验约束见下表）。
2. **查 slug**：`check_game_slug`，返回 `{slug, available, reason, quota{deployed_count, deploy_limit,
   can_deploy_new}}`。**slug 被占用是正常结果，不是错误**——被占用时给用户报几个可选的替代 slug
   让其挑选；自己已占用同一 slug = 覆盖部署，需向用户确认。`quota.can_deploy_new` 为 false 时先
   告知用户配额已满，不要硬部署。
3. **申请上传**：`request_game_upload`，入参 `file_name` 与 `file_size`（**zip 的实际字节数**，用
   `stat`/`ls -l` 读出来，不许估算；≤ 200 MB，仅接受 `.zip`/`.html`/`.htm`）。返回**一次性**的
   `upload_id` + `upload_url` + `content_type`，**30 分钟内有效**。
4. **本地上传**：对 `upload_url` 执行**单次** HTTP PUT，例如
   `curl -sS -X PUT -H "Content-Type: <返回的 content_type>" --data-binary @build.zip "<upload_url>"`。
   **`Content-Type` 必须与返回值完全一致，否则 S3 直接 403。** `upload_url` 是一次性凭据：
   **绝不写进回复、任何文件或日志**，用完即弃；过期或上传失败就重新 `request_game_upload`。
5. **部署**：`deploy_game`，入参 `client_request_id` / `upload_id` / `slug` / `title`。返回异步
   operation，按 `yoroll-plugin-basics` 的策略用 `get_operation` 有界退避轮询到终态。
   **同一 slug 的部署在服务端串行化**，排队属正常，绝不重复提交。
6. **展示**：成功后拿 `preview_url`（预发地址，立即可玩），按 basics 的可见链接策略在浏览器里
   展示给用户。已部署的游戏随时可用 `list_game_builds` 查看。

发布前仍要向用户复述"要发布什么、用什么 slug、会覆盖谁"并取得明确同意，才开始上述流程。

产物校验约束（与后端校验一致）：

| 项 | 契约 |
|---|---|
| 文件形态 | 单个 `.html`/`.htm`，**或**一个 `.zip` |
| ZIP 结构 | 必须含 `index.html`，位于压缩包根，或位于**唯一一层**顶级目录下（`MyGame/index.html`） |
| 体积 | 上传包 ≤ 2 GB；ZIP 内单文件 ≤ 1.8 GB；ZIP 内文件数 ≤ 2000 |
| 禁止文件 | 可执行/服务端脚本（`.sh` `.py` `.php` `.exe` `.bat` `.jar`）、敏感配置（`.env` `.htaccess` `web.config`） |
| slug | 3–48 字符，仅小写字母/数字/连字符，`^[a-z0-9]+(-[a-z0-9]+)*$`；保留词不可用（admin、api、www、yoroll 等） |
| title | ≤ 50 字符 |

**兜底路径**：MCP 部署链路失败且重试无效时，才降级为引导用户在平台 upload-game 页面
（工具页 → Upload Game）手动上传同一个 zip，并如实说明失败原因。

**上架送审仍在网页完成**：部署成功只意味着预发地址可玩。标题、简介、封面（横竖两版）、类型标签
的完善与提交送审在平台网页进行，过审后绑定正式域名 `https://{slug}.mimomo.ai`——到这一步引导
用户前往网页，不要代劳也不要承诺 MCP 能送审。

**TODO（未核实，落地前必须确认）**

- 接口契约：**已实现**——MCP 部署链路对应服务端 `/game-builds/uploads/presign`
  （`request_game_upload`）与 `/game-builds/deploy-upload`（`deploy_game`），参数与错误语义以
  MCP schema 为准，无需再走 Web 前端调用层。
- 内容合规：影视素材涉及肖像与版权，发布前提示用户自查，平台侧的送审规则未在本仓库找到成文依据。
