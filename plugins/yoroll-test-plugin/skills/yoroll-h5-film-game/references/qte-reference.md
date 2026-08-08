# QTE 玩法参考手册

> 来源：`LGPlatform/specs/qte-default-parameters.md`（18 种 QTE 玩法参数总表）
> 字段名已对照 `LGPlatform/internal/workflowview/types.go` 第 186-306 行的 `QTE` / `GomokuConfig` / `WhackMoleConfig` DTO 定义核对。
> 本手册面向插件 Agent：在为剧情节点选择/生成 QTE 玩法及参数时直接查阅本文件，无需回读原始规格文档。

---

## 1. 玩法速查总表

| # | 玩法名称 | type 值 | 一句话玩法描述 | 适合的剧情场景（推断） |
|---|---|---|---|---|
| 1 | 点击 | `click` | 在热区内完成指定次数的点击 | 突发反应（躲闪/拍打/按开关）、轻量教学关卡开场 |
| 2 | 射击 | `shoot2` | 在限定发射次数内命中目标区域达到要求命中数 | 枪战、狙击、投掷、远程战斗场景 |
| 3 | 长按 | `longpress` | 按住热区并保持到指定时长 | 蓄力、憋气、稳住手术刀/引信、拆弹等"坚持住"场景 |
| 4 | 滑动 | `swipe` | 朝指定方向完成一次达标滑动 | 挥剑/开门/翻书/拉弓等单次爆发动作 |
| 5 | 擦除（来回滑动擦除） | `swipeerase` | 在热区内来回擦拭达到指定次数 | 擦玻璃、擦血迹、除雾、清理现场等反复动作 |
| 6 | 张力控制/平衡 | `balance` / `balance-2` | 通过按住/松开操作使进度值落在"完美区间" | 钓鱼、心跳告白、治疗抚慰、张力对峙戏 |
| 7 | 拼图 | `puzzle` | 拖动碎片拼合成完整图片 | 解谜、回忆碎片拼接、密码/地图破译 |
| 8 | 语音 | `tencent_voice` | 说出目标短语被语音识别通过 | 喊话下令、召唤咒语、暗号对话等强代入场景 |
| 9 | 透视 | `insight` | 在画面中点出隐藏线索的位置 | 侦探找线索、暗中观察环境、埋设伏笔的悬疑戏 |
| 10 | 刮刮卡 | `insight_scratch` | 刮开覆盖层露出下方内容 | 揭晓真相、拆信封、刮奖、揭开面纱等悬念揭示 |
| 11 | 消除对对碰 | `tileslot` | 消除类益智小游戏，默认不限时 | 休闲解压、支线小游戏、修复/整理类场景 |
| 12 | 五子棋 | `gomoku` | 与 AI 对弈五子棋直至分出胜负 | 棋局对决、智斗、赌局、传统文化场景 |
| 13 | 台球 | `PoolQTE` | 在计时窗口内完成台球击球动作 | 台球厅约战、耍帅表演、休闲社交场景 |
| 14 | 打地鼠 | `whack_mole` | 限时内敲中目标数量的地鼠 | 驱赶/防御波次、游乐场小游戏、诙谐搞笑桥段 |
| 15 | 赛车 | `carracing` | 完成比赛并达到最低名次要求 | 追逐戏、竞速、逃亡、飙车约战场景 |
| 16 | 篮球 | `BasketballQTE` | 在计时窗口内完成指定命中次数投篮 | 运动竞技、街头斗牛、约战炫技场景 |
| 17 | 中国象棋 | `ChineseChessQTE` | 与 AI 对弈中国象棋 | 江湖对弈、长者较量、传统文化/棋馆场景 |
| 18 | 国际象棋 | `ChessQTE` | 与 AI 对弈国际象棋 | 高智商对决、绅士较量、学院/谍战场景 |

---

## 2. 通用字段说明

以下字段是 AI 生成 QTE 时**所有类型共享**的通用字段：

| 字段 | 说明 |
|---|---|
| `type` | QTE 玩法类型标识，取值见上表"type 值"列 |
| `duration` | 持续时间（秒）。多数玩法为 `int`，少数（如 `PoolQTE`、`whack_mole`、`BasketballQTE`、`ChineseChessQTE`、`ChessQTE`）在 DTO 中为 `float64`；`0` 通常表示不限时 |
| `delay_from_start_seconds` | QTE 相对节点开始播放的延迟时间（秒） |
| `next_node_map` | 结果跳转映射，形如 `{"0":"失败节点ID","1":"成功节点ID"}`；`ChineseChessQTE`、`ChessQTE` 明确要求必填 |
| `score_effects` | 分数效果映射（`map[string]map[string]int`），描述不同结果对分数的影响 |

**AI 生成后保留策略**：

- 上述 5 个通用字段由 AI 生成后**直接保留原值，不需要再次干预**。
- 除通用字段外，系统需要为 AI 生成的每种 QTE 补全该玩法专属的其他参数（见第 3 节各表）。
- **例外规则**：如果某个具体玩法的参数表中又列出了上述通用字段（例如 `duration` 几乎每个玩法表里都会出现），说明该玩法对这个通用字段有专属默认值/约束，此时**使用参数表中的值替换 AI 生成的值**，不再沿用 AI 的原始输出。
- `puzzle`（拼图）的 `jigsaw_puzzle_img_name`、`jigsaw_puzzle_img_url` 需要特殊处理，留待生成分镜图阶段再补全，不在 QTE 参数补全阶段处理。
- `tileslot`（消除对对碰）的 `duration` 默认值为 `0`，表示不限时，插入该玩法时需注意与"限时张力"类场景的差异。

> **类型口径提醒**：原始规格文档中部分数值字段标注为 `int`，但在实际 DTO（`types.go`）中以 `string` 承载（例如 `jigsaw_puzzle_grid_size_x`/`jigsaw_puzzle_grid_size_y`、以及 `click_count`、`shoot_*`、`swipe_*`、`balance_*` 等绝大多数玩法专属参数）。生成 JSON 时请以 DTO 的字符串类型为准，避免类型不匹配导致解析失败。下表"类型"列按原始规格文档转写，供理解字段含义使用；实际序列化时如遇冲突以 DTO 的 `string` 类型为准。

---

## 3. 各玩法参数表

### 3.1 点击 (`click`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| click_count | string | ✅ | "1" | 目标点击次数，单次点击固定为 "1" |
| area_position | string | ❌ | "0.5,0.5" | 热区中心坐标 "x,y"（0-1 归一化） |
| area_size | string | ❌ | "0.5,0.5" | 热区大小 "w,h"（0-1 归一化） |
| duration | int | ✅ | 4 | 持续时间 |

### 3.2 射击 (`shoot2`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| area_position | string | ❌ | "0.5,0.5" | 目标中心坐标 "x,y"（0-1 归一化） |
| shoot_radius | string | ✅ | "0.5" | 目标范围半径（像素） |
| shoot_max_fired_count | string | ✅ | "5" | 最大射击次数（最小 1） |
| shoot_hit_count | string | ✅ | "3" | 需要命中次数（最小 1，≤ max_fired） |
| duration | int | ✅ | 4 | 持续时间 |

### 3.3 长按 (`longpress`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| press_time | string | ✅ | "2.0" | 需要按住的时长（秒，最小 0.05） |
| area_size | string | ❌ | "0.5,0.5" | 热区大小 "w,h"（0-1 归一化） |
| area_position | string | ❌ | "0.5,0.5" | 热区中心坐标 "x,y"（0-1 归一化） |
| duration | int | ✅ | 4 | 持续时间 |

### 3.4 滑动 (`swipe`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| swipe_direction | string | ✅ | "right" | 方向："up"/"down"/"left"/"right" |
| swipe_min_distance | string | ✅ | "50.0" | 最小滑动距离（像素，最小 5.0） |
| swipe_angle_tolerance | string | ✅ | "30.0" | 角度容差（1-89 度） |
| area_size | string | ❌ | "0.5,0.5" | 热区尺寸 "w,h"（0-1 归一化） |
| area_position | string | ❌ | "0.5,0.5" | 热区中心坐标 "x,y"（0-1 归一化） |
| duration | int | ✅ | 4 | 持续时间 |

### 3.5 擦除/来回滑动擦除 (`swipeerase`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| swipe_erase_direction | string | ✅ | "horizontal" | 方向："horizontal"/"vertical" / "v" / "y" |
| swipe_erase_required_count | string | ✅ | "4" | 需要来回次数（最小 1） |
| swipe_erase_min_distance | string | ❌ | "50" | 最小擦拭距离（像素，最小 5.0） |
| area_size | string | ❌ | "0.5,0.5" | 热区大小 "w,h"（0-1 归一化） |
| area_position | string | ❌ | "0.5,0.5" | 热区中心坐标 "x,y"（0-1 归一化） |
| duration | int | ✅ | 4 | 持续时间 |

### 3.6 张力控制/平衡 (`balance` / `balance-2`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| style | int | ❌ | 0 | UI 样式：0/1/2/3；0-钓鱼，1-心动1，2-心动2，3-治愈 |
| balance_initial_perfect | string | ✅ | "65" | 初始完美值 0-100 |
| balance_perfect_zone_min | string | ✅ | "0.5" | 完美区间下限（0-1） |
| balance_perfect_zone_max | string | ✅ | "0.8" | 完美区间上限（0-1） |
| balance_max_progress_duration | string | ❌ | "1.0" | 最大持续时长（秒，最小 0.1），可不输出 |
| balance_is_reverse | string | ❌ | "false" | 反向模式 "true"/"false"，可不输出 |
| balance_increase_rate | string | ❌ | "25.0" | 上升速度（最小 0.1），可不输出 |
| balance_decrease_rate | string | ❌ | "4.0" | 下降速度（最小 0.1），可不输出 |
| balance_press_speed_multiplier | string | ❌ | "0.7" | 按住倍率（最小 0.1），可不输出 |
| balance_release_speed_multiplier | string | ❌ | "0.85" | 松开倍率（最小 0.1），可不输出 |
| background_video_url | string | ❌ | "" | 背景视频 URL，m3u8 格式 |
| duration | int | ✅ | 2 | 持续时间 |

### 3.7 拼图 (`puzzle`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| jigsaw_puzzle_grid_size_x | int | ✅ | 3 | 拼图网格宽度（列数） |
| jigsaw_puzzle_grid_size_y | int | ✅ | 3 | 拼图网格高度（行数） |
| jigsaw_puzzle_img_name | string | ❌ | "" | 拼图图片相对路径（用于本地缓存） |
| jigsaw_puzzle_img_url | string | ✅ | "" | 拼图图片下载 URL |
| duration | int | ✅ | 120 | 持续时间 |

- `jigsaw_puzzle_img_name`、`jigsaw_puzzle_img_url` 需要特殊处理，在生成分镜图的时候再补全。

### 3.8 语音 (`tencent_voice`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| voice_target_phrase | string | ✅ | "" | 目标识别短语 |
| voice_target_all_phrase | string | ❌ | "" | 备选识别短语（多个用 \| 分隔） |
| instruction_text_1 | string | ❌ | "" | 自定义提示文本 1 |
| instruction_text_2 | string | ❌ | "" | 自定义提示文本 2 |
| duration | int | ✅ | 15 | 持续时间 |

- 需要判断当前选择的语言：
  - 中文：`instruction_text_1`="我们已准备好复仇！"，`instruction_text_2`="队长，我们攻击左边还是右边？"，`voice_target_phrase`="攻击左边"，`voice_target_all_phrase`="左边"。
  - 其他语言：`instruction_text_1`="We're ready for revenge!"，`instruction_text_2`="Captain, do we attack left or right?"，`voice_target_phrase`="Attack left"，`voice_target_all_phrase`="Left"。

### 3.9 透视 (`insight`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| instruction_text_1 | string | - | "" | 提示文案 |
| insight_targets | array | - | ["0, 0"] | 目标线索（可多个）的屏幕位置数组，位置为百分比，"0,0" 代表屏幕中心；配置举例：["0.2, -0.15", "0, 0"] |
| insight_video_url | string | - | "" | 副视频 URL；m3u8 格式 |
| duration | int | ✅ | 4 | 持续时间 |

- 中文：`instruction_text_1`="寻找隐藏线索"。
- 其他语言：`instruction_text_1`="Search for hidden clues"。

### 3.10 刮刮卡 (`insight_scratch`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| instruction_text_1 | string | - | "" | 提示文案 |
| insight_video_url | string | ✅ | "" | 覆盖视频 URL，m3u8 格式 |
| duration | int | ✅ | 6 | 持续时间 |

- 中文：`instruction_text_1`="刮开查看内容"。
- 其他语言：`instruction_text_1`="Scratch to reveal"。

### 3.11 消除对对碰 (`tileslot`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| tileslot_level_index | int | ✅ | 0 | 关卡索引 |
| tileslot_background_url | string | ❌ | "" | 背景图 CDN URL |
| instruction_text_1 | string | ❌ | "" | 提示文本 |
| duration | int | ✅ | 0 | 持续时间，0 表示不限时 |

### 3.12 五子棋 (`gomoku`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| duration | int | ✅ | 300 | 持续时间 |
| gomoku_config.board_size | int | ✅ | 15 | 棋盘尺寸 |
| gomoku_config.ai_difficulty | int | ✅ | 3 | AI 难度 1~5 |
| gomoku_config.ai_think_delay | float | ✅ | 1.0 | AI 思考延迟 |
| gomoku_config.player_starts | bool | ✅ | true | 玩家先手 |
| gomoku_config.show_coordinates | bool | ❌ | false | 是否显示坐标 |
| gomoku_config.success_score | int | ✅ | 1 | 成功分数 |
| gomoku_config.failure_score | int | ✅ | 0 | 失败分数 |
| gomoku_config.title_text | string | ❌ | 本地化默认值 | 标题文案 |
| gomoku_config.player_turn_text | string | ❌ | 本地化默认值 | 玩家回合提示 |
| gomoku_config.computer_turn_text | string | ❌ | 本地化默认值 | 电脑回合提示 |
| gomoku_config.thinking_text | string | ❌ | 本地化默认值 | 思考提示 |
| gomoku_config.player_win_text | string | ❌ | 本地化默认值 | 玩家获胜文案 |
| gomoku_config.computer_win_text | string | ❌ | 本地化默认值 | 电脑获胜文案 |
| gomoku_config.draw_text | string | ❌ | 本地化默认值 | 平局文案 |

- 中文默认：`title_text`="五子棋对弈"，`player_turn_text`="你的回合"，`computer_turn_text`="对手思考中..."，`thinking_text`="对手思考中..."，`player_win_text`="你赢了！"，`computer_win_text`="你输了！"，`draw_text`="平局"。
- 英文默认：`title_text`="Gomoku"，`player_turn_text`="Your turn"，`computer_turn_text`="Opponent is thinking..."，`thinking_text`="Opponent is thinking..."，`player_win_text`="You win!"，`computer_win_text`="You lose!"，`draw_text`="Draw"。

### 3.13 台球 (`PoolQTE`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| duration | float | ✅ | 3.0 | 计时窗口 |

### 3.14 打地鼠 (`whack_mole`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| duration | float | ✅ | 30.0 | 持续时间 |
| whack_mole_config.target_hits | int | ✅ | 10 | 目标命中数 |
| whack_mole_config.max_misses | int | ✅ | -1 | 最大漏击数 |
| whack_mole_config.spawn_interval | float | ✅ | 0.7 | 刷新间隔 |
| whack_mole_config.spawn_interval_jitter | float | ✅ | 0.15 | 刷新抖动 |
| whack_mole_config.mole_visible_duration | float | ✅ | 0.9 | 露出时长 |
| whack_mole_config.simultaneous_moles | int | ✅ | 1 | 同时出现数量 |
| whack_mole_config.pre_spawn_delay | float | ✅ | 0 | 首次刷新延迟 |
| whack_mole_config.allow_same_hole_consecutive | bool | ❌ | false | 是否允许同洞连续刷新 |
| whack_mole_config.count_expired_as_miss | bool | ✅ | true | 超时是否计 miss |
| whack_mole_config.fail_on_timeout | bool | ✅ | true | 超时是否失败 |
| whack_mole_config.success_score | int | ✅ | 1 | 成功分数 |
| whack_mole_config.failure_score | int | ✅ | 0 | 失败分数 |
| whack_mole_config.mole_label | string | ❌ | 本地化默认值 | 地鼠文案 |

- 中文默认：`mole_label`="打！"
- 英文默认：`mole_label`="Hit!"

### 3.15 赛车 (`carracing`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| duration | int | ✅ | 0 | 比赛时长，0 表示不限时 |
| required_rank | int | ✅ | 3 | 最低达标排名 |

### 3.16 篮球 (`BasketballQTE`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| duration | float | ✅ | 3.0 | 计时窗口 |
| shoot_count | string | ✅ | "5" | 命中次数 |

### 3.17 中国象棋 (`ChineseChessQTE`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| duration | float | ❌ | 0 | 计时窗口（秒），0 表示不限时 |
| chinese_chess_difficulty | int | ❌ | 1 | 难度：1 简单 / 2 中等 / 3 困难 |
| instruction_text_1 | string | ❌ | - | 提示文字 |
| next_node_map | map | ✅ | - | 结果跳转：`{"0":"失败节点ID","1":"成功节点ID"}` |

### 3.18 国际象棋 (`ChessQTE`)

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| duration | float | ❌ | 0 | 计时窗口（秒），0 表示不限时 |
| chess_difficulty | int | ❌ | 3 | 难度：1~5，越高难度越大 |
| next_node_map | map | ✅ | - | 结果跳转：`{"0":"失败节点ID","1":"成功节点ID"}` |

---

## 4. 配玩法的原则建议

以下为插件 Agent 在剧情节点中插入/搭配 QTE 玩法时的经验性原则（基于玩法特性推断，非原始规格文档内容）：

### 4.1 密度：多久插一个

- QTE 是"打断叙事换取参与感"的强手段，过密会打断沉浸、过疏则失去互动价值。经验区间：**每 2-4 个剧情节点/1-3 分钟叙事内容插入 1 个 QTE**，具体视剧情类型微调。
- 短时反应类（`click`、`shoot2`、`longpress`、`swipe`、`swipeerase`）耗时短（默认 4 秒左右），适合作为"高频调味"插入到对话/叙事密集处，不宜连续背靠背出现超过 2 次，否则显得机械。
- 长耗时/沉浸类（`puzzle` 默认 120 秒、`gomoku` 默认 300 秒、`tileslot` 不限时）属于"主菜级"玩法，一整段剧情（一章/一个场景）内出现 1 次为宜，避免与其他长耗时玩法紧邻放置，防止节奏拖沓。
- 竞技对局类（`gomoku`、`ChineseChessQTE`、`ChessQTE`、`carracing`、`BasketballQTE`、`PoolQTE`）通常对应一场完整的"戏眼"事件，建议作为章节高潮或关键抉择点单独安排，不与其他 QTE 挤在同一小节内。

### 4.2 难度递进

- 同一玩法连续复用时，应通过参数体现难度爬坡，而非机械重复同一配置：
  - `click`/`shoot2`：逐步提高 `shoot_hit_count`/`shoot_max_fired_count` 比例或缩小 `area_size`。
  - `longpress`：逐步延长 `press_time`。
  - `swipe`/`swipeerase`：收紧 `swipe_angle_tolerance`，增加 `swipe_erase_required_count`。
  - `balance`/`balance-2`：缩窄 `balance_perfect_zone_min`~`balance_perfect_zone_max` 区间，或调整 `balance_increase_rate`/`balance_decrease_rate` 使操作更紧张。
  - 棋类（`gomoku`/`ChineseChessQTE`/`ChessQTE`）：随剧情推进提高 `ai_difficulty`/`chinese_chess_difficulty`/`chess_difficulty`。
  - `whack_mole`：提高 `target_hits`，缩短 `spawn_interval`/`mole_visible_duration`。
- 建议全篇难度曲线呈"低-中-高-（可选）缓冲-高潮"走势：开场用简单玩法（`click`、`insight`）建立操作习惯，中段引入中等难度的方向性/时序性玩法（`swipe`、`longpress`、`balance`），高潮段使用高操作强度或强竞技玩法（`shoot2` 高命中要求、`gomoku`/`ChessQTE` 高难度、`carracing`/`BasketballQTE`）。
- 避免在剧情前期使用高耗时高难度玩法（如高难度 `ChessQTE`、`gomoku`），以免玩家在未建立情感投入前被硬核玩法劝退。

### 4.3 玩法与情绪节奏的匹配

- **紧张/危机场景**（追击、拆弹、战斗）→ 短平快反应类：`click`、`shoot2`、`longpress`、`swipe`、`swipeerase`；配合较短 `duration`、较紧的容差参数强化紧迫感。
- **暧昧/情感张力场景**（告白、心动、治愈）→ `balance`/`balance-2`（`style` 选 1/2/3 对应心动/治愈皮肤），用"完美区间"的精细控制隐喻情感的分寸感。
- **悬疑/解谜场景**（找线索、破译、揭秘）→ `insight`（找线索）、`insight_scratch`（揭晓真相）、`puzzle`（拼凑真相/地图）；建议按"发现线索(insight)→拼合信息(puzzle)→揭晓结果(insight_scratch)"的顺序组合使用，形成小型解谜链条。
- **对抗/博弈场景**（智斗、谈判、赌局）→ 棋类（`gomoku`/`ChineseChessQTE`/`ChessQTE`），通过 AI 难度参数映射对手的"棋力"与剧情设定（如"江湖高手"用更高难度）。
- **竞速/追逐场景** → `carracing`，`required_rank` 可映射剧情紧迫程度（排名要求越高，逃脱/取胜难度越大）。
- **轻松/诙谐/支线场景** → `whack_mole`、`tileslot`、`PoolQTE`、`BasketballQTE`，用于调节主线节奏、提供喘息空间，不建议承载核心剧情抉择（`next_node_map` 的失败分支后果应相对温和）。
- **强代入/角色扮演场景**（喊话、下令、召唤）→ `tencent_voice`，通过语音复述台词强化玩家与角色的合一感，适合放在情绪爆发点（如反击前的誓师）。
- 无论选用哪种玩法，`next_node_map` 对应的失败分支叙事后果应与该玩法的情绪强度相称：高强度玩法（战斗、竞速、高难度棋局）失败可承担较重后果（角色受伤/剧情分支转向），轻松向玩法（打地鼠、消除、台球）失败宜给予温和的重试/调侃式反馈，避免挫败感与场景基调不符。
