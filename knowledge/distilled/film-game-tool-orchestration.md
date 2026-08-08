# 影游创作工具编排参考

> 用途：作为将来撰写「影游创作 SKILL.md」的骨架依据。
> 来源：`LGPlatform/docs/mcp-server.md`（工具全集与调用契约）+ `yoroll-test-plugin/skills/yoroll-plugin-basics/SKILL.md`（浏览器/轮询策略）。
> 原则：**MCP 是唯一业务真相源；内置浏览器（IAB）只是可视工作台，永远不用 DOM 自动化改稿。**
> 凡标注 `[待验证]` 的，是两份来源文档未写死的参数细节，落地前需对照 `tools/list` 的实际 JSON Schema 确认。

---

## 0. 三条贯穿全流程的铁律

1. **凡是「会写库 / 会花积分」的工具，都必须带调用方自己生成的 `client_request_id`，并且返回的是一个持久 operation 对象，不是最终结果。**
   - 拿到 operation 之后：把 `operation.id` 传给 `get_operation.operation_id`，带退避地轮询到 `succeeded` / `failed`。
   - 已返回 operation ID = 该操作已被受理。**绝不重复提交同一个业务工具**，哪怕看起来"没反应"。
   - `client_request_id` 只在「完全相同的重试」时复用；参数变了必须换新的（复用同 key 但参数不同会被服务端拒绝）。
2. **并发保护有两套，语义完全不同，不能混用**（详见第 2 节）：
   - `expected_revision` = 真锁（`If-Match` 原子校验 + revision 恰好自增一次 + `Idempotency-Key` 存响应）。
   - `expected_updated_at` = 只是"派发前的陈旧状态检查"，**不是锁、不是 CAS**，provider 开始干活之后不再提供任何保证。
3. **URL 只能用 MCP 原样返回的。** 不得由 stage 名 / 工具名拼接项目子路径；一次性 `handoff_url` 永不出现在聊天里、永不在 IAB 之外打开。

---

## 1. 端到端调用序列：create_project → publish_project

下表是标准顺序。"同步"指短事务、直接返回结果；"异步"指返回 operation、需 `get_operation` 轮询。

| # | 阶段 | 工具 | 同步/异步 | 并发参数 | 备注 |
|---|------|------|-----------|----------|------|
| 0 | 展示创作入口 | `render_creation_menu` / `get_creation_options` | 同步 | — | 匿名（`noauth`）。菜单卡片本身即完整回复，卡片下方不要再写解释。 |
| 0.5 | 预算体检（可选） | `get_credit_balance` | 同步 | — | 见第 6 节：只在"将要开销大头"之前查。 |
| 1 | 建项目 | `create_project` | **异步** | — | 需 `client_request_id`。用用户原话当 idea，别自行扩写成设计文档。 |
| 2 | 等项目就绪 + 首次开窗 | `get_operation` 轮询 | 轮询 | — | **非终态轮询首次返回普通 `web_url` 时，立刻在 IAB 打开**（第 4 节），然后继续轮询，不重新提交。 |
| 3 | 读故事 | `get_story` | 同步 | 取 `revision` | 只读需要的域，别全量拉。 |
| 4 | 改故事设定 | `update_story` / `update_project_title` / `update_generation_config` / `update_ui_config` | 同步 | 传 `expected_revision` | 短事务型写入。 |
| 5 | 生成剧情结构 | `generate_plot` | **异步** | `expected_updated_at` | 长生成。 |
| 6 | 读大纲 | `get_plot_outline` | 同步 | 取 `revision` | |
| 7 | 结构微调 | `add_chapter` / `update_chapter` / `remove_chapter` / `add_episode` / `update_episode` / `remove_episode` / `set_chapter_start_episode` | 同步 | `expected_revision` | 章节/剧集骨架。 |
| 8 | 生成角色 | `generate_characters` | **异步** | `expected_updated_at` | |
| 9 | 读角色 | `get_characters` | 同步 | 取 `revision` | |
| 10 | 角色增删改 | `add_character` / `update_character` / `remove_character` | 同步 | `expected_revision` | 文本层面的角色设定。 |
| 11 | 角色图批量生成 | `generate_character_images` | **异步** | `expected_updated_at` | |
| 12 | 读分镜 | `get_scenes` | 同步 | 取 `revision` | |
| 13 | 分镜增删改/排序 | `add_scene` / `update_scene` / `remove_scene` / `reorder_scene` / `duplicate_scene` / `move_scenes` / `remove_scenes` | 同步 | `expected_revision` | |
| 14 | 分镜图批量生成 | `generate_scene_images` | **异步** | `expected_updated_at` | |
| 15 | 首帧（视频前置） | `generate_first_frame_image` | **异步** | **`expected_revision`**（例外！） | 见第 2 节例外项。 |
| 16 | 分镜视频批量生成 | `generate_scene_videos` | **异步** | `expected_updated_at` | 最贵的一步，务必先确认。 |
| 17 | 生成 UI | `generate_ui` | **异步** | `expected_updated_at` | |
| 18 | 状态巡检 | `get_project_status` / `get_project` | 同步 | — | 汇总态；也可 `list_operations` 看在途作业。 |
| 19 | **发布前校验** | `validate_publish` | 同步 | — | 返回 blockers + `workflow_updated_at`。 |
| 20 | 发布 | `publish_project` | **异步** | `expected_updated_at` = 上一步的 `workflow_updated_at` | 必须先向用户确认。 |
| 21 | 发布态刷新 | `get_publish_status` | 同步 | — | 后续再看发布结果用它，不要重复 `publish_project`。 |

### 1.1 轮询模式模板（异步工具通用）

```
1. 生成一个稳定的 client_request_id（本次逻辑操作唯一）
2. 调用业务工具  → 得到 operation {id, status, ...}
3. loop:
     get_operation(operation_id = operation.id)
     - 非终态 + 首次出现普通 web_url  → 按第 4 节在 IAB 打开（只做一次），不 finalize，继续轮询
     - 非终态                          → 退避等待后继续（bounded backoff）
     - succeeded / failed / cancelled  → 退出
4. 终态处理：
     - succeeded → 复用预览 tab，导航到终态 web_url（若变了），finalize 为 deliverable
     - failed    → 只报告工具确认的失败事实；重试要么复用同一 client_request_id（完全相同的重试），
                   要么先重读工作流再换新 id
5. 用户要求中止 → cancel_operation（不要靠"不轮询"当作取消）
```

- 禁止行为：轮询超时就重发业务工具、把 operation 当结果直接回报、在 operation 未终态时宣称已完成。

### 1.2 独立媒体（不进项目工作流）

- `generate_image` / `generate_video` / `synthesize_dialogue` / `generate_bgm`：都是**异步 + `client_request_id`**，且**不需要 project_id**（别去要、别去编）。
- 产物用 `list_media_assets` / `get_media_asset` 取回；后续引用**优先记 `media_asset_id`，不要记临时 provider URL**。
- 要并入工作流时，只能通过聚焦的项目工具（如 `attach_scene_video`），并且要用户明确要求。
- 首次引导（first-run）中不主动推销 `synthesize_dialogue` / `generate_bgm`。

---

## 2. 并发控制要点

### 2.1 `expected_revision`——真正的乐观锁

- **语义**：平台用 `If-Match` 与写入原子校验，revision 恰好自增一次，成功响应按 `Idempotency-Key` 存档。MCP worker 在派发前持久化 checkpoint（已解析的并发令牌 + 精确请求指纹），进程重启后可用同 key 重放取回原响应。
- **用在**：所有「短的、数据库支撑的工作流写入」，即上表第 4/7/10/13 步那一类，外加两个异步例外（下）。
- **取值来源**：紧邻的那次工作流读工具返回的 `revision` —— 改故事读 `get_story`、改角色读 `get_characters`、改结构读 `get_plot_outline`、改分镜读 `get_scenes`。**读哪个域就用哪个域的 revision，不要跨域复用。** `[待验证]` 字段确切位置（顶层 `revision` vs 嵌套）以实际 schema 为准。
- **异步例外（重要）**：`regenerate_scene_image` 与 `generate_first_frame_image` 虽然是长生成，但**接受 `expected_revision`**。平台在「预留积分 + 创建 owner-scoped 图片作业 + 记工作流 marker + 存 202 响应」这一段是原子的；provider 完成仍是异步的，MCP 轮询 `/api/v1/image-jobs/{jobID}` 而不是靠 workflow stage 猜完成。
  → 编排含义：这两个工具**既要 `expected_revision`，也要走 operation 轮询**。

### 2.2 `expected_updated_at`——只是陈旧检查

- **语义**：派发前的 preview stale-state 检查。**不是锁，不是 CAS**；provider 开工后不再有任何保证。
- **用在**：其余长生成 / 工作流媒体工具（`generate_plot`、`generate_characters`、`generate_character_images`、`generate_scene_images`、`generate_scene_videos`、`generate_ui`、`regenerate_character_image`、`regenerate_character_sheet`、`regenerate_scene_video`、`attach_scene_video` 等），以及 `publish_project`。
- **取值来源**：
  - 一般生成 → 对应工作流读工具返回的更新时间戳 `[待验证]` 字段名。
  - **发布 → 必须取 `validate_publish` 返回的 `workflow_updated_at`**（第 5 节）。
- **别做的事**：不要拿它当"独占编辑"的依据向用户承诺；不要在长任务跑起来后再用它去"校验"什么。

### 2.3 冲突处理

- 收到 revision / 时间戳冲突时：**重读受影响的那个工作流域 → 把用户的原始意图重新落到新状态上 → 再重试**。绝不盲目 retry、绝不丢掉用户改动、绝不用 `{mode:"latest"}` 之类手段绕过冲突。
- 所有 ID（project / scene / character / asset / operation / media）**只用 MCP 返回过的**，一律不许猜。

---

## 3. 局部重做的工具映射

创作是迭代的，绝大多数"再来一次"都不该重跑整条流水线。对照表：

| 用户诉求 | 正确工具 | 类型 | 并发参数 |
|---|---|---|---|
| 改剧情文本 / 世界观设定 | `update_story` | 同步 | `expected_revision`（来自 `get_story`） |
| 改项目名 | `update_project_title` | 同步 | `expected_revision` |
| 改生成参数（模型/风格等） | `update_generation_config` | 同步 | `expected_revision` |
| 改 UI 配置 | `update_ui_config` | 同步 | `expected_revision` |
| **整体重写剧情结构** | `generate_plot` | 异步 | `expected_updated_at` |
| 只调某一章/某一集 | `update_chapter` / `update_episode` / `set_chapter_start_episode` | 同步 | `expected_revision` |
| 改角色设定文字 | `update_character` | 同步 | `expected_revision`（来自 `get_characters`） |
| **换某个角色的图** | `regenerate_character_image` | 异步 | `expected_updated_at` |
| 换某个角色的三视图/角色表 | `regenerate_character_sheet` | 异步 | `expected_updated_at` |
| 全部角色重出图 | `generate_character_images` | 异步 | `expected_updated_at` |
| 改某个镜头的文本/描述 | `update_scene` | 同步 | `expected_revision`（来自 `get_scenes`） |
| **重生成某镜头的图** | `regenerate_scene_image` | 异步 | **`expected_revision`**（例外） |
| 给某镜头做首帧 | `generate_first_frame_image` | 异步 | **`expected_revision`**（例外） |
| **重生成某镜头的视频** | `regenerate_scene_video` | 异步 | `expected_updated_at` |
| 把已有视频挂到镜头上 | `attach_scene_video` | 异步 | `expected_updated_at` |
| **回退到之前某一版**（图/视频/UI） | 先 `*_history` 读版本，再 `select_asset_version` | 同步 | `[待验证]` |
| 重出 UI | `generate_ui` | 异步 | `expected_updated_at` |

### 3.1 历史与版本回退（"上一版更好"）

- 列版本：`list_workflow_asset_versions`（总览）、`get_character_image_history`、`get_scene_image_history`、`get_first_frame_image_history`、`get_scene_video_history`、`get_ui_history`。
- `get_ui_history` **在 LGPlatform API 边界分页**，用正整数 version 游标：转发 `limit` / `cursor`，**不要拉全量再本地截断**。
- 选版本 `select_asset_version` 用**显式嵌套**结构：
  - 固定某个不可变版本：`{"mode":"version","version":N}`（N 为正整数）
  - 恢复自动跟随最新：`{"mode":"latest"}`
  - **`asset_type: "ui"` 没有"自动最新"状态，必须用 `mode: "version"`。**
  - 旧的顶层 `version` 字段**已不被接受**，不要生成。
- 编排建议：**"我不喜欢这版"先问是回退还是重生成**。回退是同步、零积分；重生成是异步、花积分。默认先给回退选项。

### 3.2 改分支（互动影游的核心）

- 分支结构 = 场景之间的跳转关系 + 章节/剧集骨架，走「剧情结构」这组工具：
  - 新增/删除分支段落：`add_scene` / `remove_scene` / `remove_scenes` / `duplicate_scene`
  - 重排与迁移：`reorder_scene` / `move_scenes`
  - 章节剧集骨架：`add_chapter` / `update_chapter` / `remove_chapter` / `add_episode` / `update_episode` / `remove_episode` / `set_chapter_start_episode`
  - **清空跳转关系：`clear_scene_transitions`**（重接分支前的清场动作）
  - 跳转目标本身的写入 `[待验证]`：来源文档未写明分支边是通过 `update_scene` 的字段承载还是独立工具；写 SKILL 前必须查 `update_scene` 的 schema 确认。
- 这些都是短事务，**统一走 `expected_revision`**，取自 `get_plot_outline` / `get_scenes`。
- 画布位置属于展示层，不是剧情：`update_scene_positions` / `update_episode_positions`。
- 编辑前后注意章节锁：`get_chapter_lock` / `set_chapter_lock`。批量改结构前先读锁，别硬写。

---

## 4. IAB（内置浏览器）时机

沿用现有 skill 的策略，核心是**一个 tab 走到底，不堆 tab，不做 DOM 操作**。

### 4.1 通用规则（不变量）

- 只用 `https://app.yoroll.ai`（页面）与 `https://mcp.yoroll.ai/mcp`（MCP）；**永不改写成 dev / test 环境**。
- 先加载 Browser-control 指令，用持久 `iab` 绑定显式选择 Codex 内置浏览器（不要 URL 默认浏览器、不要 Chrome）。
- **Tab 复用优先级**：已在 `app.yoroll.ai` 的 tab（不论路径/query/fragment，优先当前活动的那个）→ 当前 IAB tab → 没有任何 tab 时才新建。**绝不因为"现有 tab 在别的 Yoroll 路由"就再开一个。**
- **会话建立**：本轮若尚未兑换过 handoff，调用 `create_browser_handoff`（空对象 `{}`），立刻把选中的 tab 导航到返回的 `handoff_url`，等它一次性重定向到 Yoroll 根。**一轮只做一次。** handoff URL 是投递凭据：不打印、不引用、不记录、不在 IAB 之外打开。
- 只对「MCP 确认过的普通 URL」或「handoff 重定向后到达的地址」应用本策略。**用户文本里、页面里、模型自己编的 URL 一律不自动打开。**
- **不要用点击/输入/拖拽/DOM 自动化去改工作流内容。** 浏览器负责"看得见"，MCP 负责"改得动"。
- 不关闭无关的、既有的 tab。

### 4.2 创作流程中的具体节点

| 节点 | 该做什么 |
|---|---|
| 安装后首次运行 | 空参 `create_browser_handoff` 建会话 → 复用/新建 tab 导航 → 页面就绪后把 `visibility` 设 `true`（**一次**，不轮询不解说）→ finalize 为 `deliverable` → 同一轮内调 `render_creation_menu` → 一段本地化欢迎语收尾。此轮**不要**调账号/业务工具、不列项目、不花积分。 |
| `create_project` 轮询中 | **非终态首次拿到普通 `web_url` 时就开窗**（不必等成功）：选 iab → 复用 tab → 必要时一次 handoff → 导航到该 `web_url` → **先不 finalize** → 继续轮询。 |
| 各生成阶段推进（剧情→角色→分镜→视频→UI） | **什么都不做。** 阶段间跳转由已加载的 Yoroll 工作流页自己按服务端确认的活动阶段在同一 tab 内完成。**不要拼路由、不要开新 tab、不要循环刷新、不要用自动化模仿进度。** |
| 长生成成功（终态） | 复用那个实时预览 tab；若终态 `web_url` 变了就导航过去；finalize 为 `deliverable`。**已认证的预览 tab 不要为了 finalize 再建一次 handoff。** |
| 从未开过预览就成功了 | 用**带 `operation_id`** 的 `create_browser_handoff`（绑定到该 operation 服务端生成的同源目的地）→ 导航 → 等重定向到普通项目/媒体 URL → finalize 为 `deliverable`。 |
| 回复里要出现普通 `web_url` 时 | 先按上述策略让右侧浏览器显示同一目的地，再回复；URL 本身仍作为可见兜底保留。 |
| 浏览器打开失败 | 报告这一局限，仍然返回 MCP 给的普通 `web_url`；**绝不退化成暴露 handoff URL**，也不要用未认证裸 URL 顶替。 |
| 局部重做（改一张图/一个镜头） | 沿用已 deliverable 的那个 tab，让页面自己刷新到新状态即可；**不为每次小重做重开 tab 或重建 handoff**。 |

- 路由注意：角色编辑页是 `/workflows/{project_id}/cast`；`/workflows/{project_id}/character` **不是浏览器页面**，不要拼。
- 不检查、不搬运 cookie / localStorage / 密码 / 会话数据。
- 遗留路径 `approve_browser_session` 与 `/auth/mcp-connect` 本插件**不使用**。

---

## 5. 发布前检查清单

正确姿势只有一条链：**`validate_publish` → 读 blockers → 用户确认 → `publish_project` → 轮询 → `get_publish_status`**。

1. **紧邻**发布调用 `validate_publish`。中间不要再插入任何工作流写入 —— 一旦插入，拿到的 `workflow_updated_at` 就作废了，必须重跑 `validate_publish`。
2. **把 blockers 原样报告给用户**，不要自行判断"这个应该不影响"。有 blocker 就不要发布。
3. **发布前必须拿到用户明确确认**（发布与花积分、删内容同属需确认动作）。认证同意 ≠ 发布同意。
4. `publish_project` 带上：
   - `client_request_id`（新生成，稳定）
   - `expected_updated_at` = 第 1 步返回的 `workflow_updated_at`
   - 心里清楚这是**派发时的陈旧检查，不是发布锁**。
5. 返回 operation → 按第 1.1 节轮询到终态。**绝不因为"还没看到结果"就再发一次 `publish_project`。**
6. 之后任何时候要看发布状态，用 `get_publish_status`，不要重跑发布。
7. 若 `expected_updated_at` 冲突（说明期间有人改了工作流）：重跑 `validate_publish` 拿新时间戳，重新过一遍 blockers 与确认，再发布。
8. 完成回报只写工具确认过的事实：终态、扣费（若返回）、以及 MCP 真的返回了的普通 `web_url`。

---

## 6. 积分与预算：`get_credit_balance` 使用时机

- **该查的时候**：
  1. 用户直接问余额 / 费用 / 还能做多少。
  2. **大额批量生成之前** —— `generate_scene_videos`、`generate_scene_images`、`generate_character_images`、`generate_ui`，即将开销的那一步之前查一次，用于给出"够/不够"的判断，一并放进确认话术。
  3. 某个异步操作以「积分不足」类原因失败后，用它确认现状再决定下一步。
  4. 长会话中做过多次生成、准备开下一批时，复查一次而不是沿用旧数字。
- **不该查的时候**：
  1. **首次运行 / 渲染创作卡片时** —— 那一轮除空参 `create_browser_handoff` 外不调任何账号或业务工具，`get_credit_balance` 也在禁列。
  2. 每次工具调用前的例行查询（噪音，且是受保护调用）。
  3. 只为在回复里凑一句"当前余额 X"。
- **配合动作**：
  - 花积分前，用平白话概括这次请求的实际内容与代价，**取得用户明确确认**后再调那一个对应的受保护工具。
  - 账号身份信息用 `get_account`，不要用它替代余额查询。
  - 扣费数额**只报工具真实返回的**，不要估算、不要换算。
  - 用户中途喊停在途任务：`cancel_operation`（可能已发生的扣费按工具返回为准，不臆测退款）。

---

## 7. 写 SKILL.md 时需要先落实的 `[待验证]` 项

1. `revision` 与更新时间戳字段在各 workflow 读工具响应中的确切名称与层级。
2. 分支跳转边（scene transition）的写入载体：`update_scene` 字段 vs 独立工具；`clear_scene_transitions` 的作用范围（整章 / 整项目 / 指定场景集）。
3. `select_asset_version` 的 `asset_type` 取值全集，以及它是否/如何接受并发参数。
4. 各异步工具是否**都**在 `tools/list` 里声明了 `client_request_id` 为必填（文档表述是"mutating 或 credit-consuming"，边界工具需逐个核对）。
5. `get_project_status` 与 `get_operation` 的职责边界：前者是项目聚合态，后者是单次作业态，不要互相替代。
6. `list_operations` 的过滤能力（能否按 project / 状态过滤），决定"断线恢复"时能不能靠它找回在途作业。
