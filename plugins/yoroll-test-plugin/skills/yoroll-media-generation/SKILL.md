---
name: yoroll-media-generation
description: Turn a one-line request into a standalone Yoroll image, video, dialogue voiceover, or background-music generation. Use when the user asks to generate a single image, picture, poster, video clip, voiceover/TTS line, or BGM track and either mentions Yoroll explicitly, arrived from the Yoroll installer, or is already working inside a Yoroll session — and the asset is NOT part of an interactive film-game workflow. Covers prompt engineering, model/ratio/quantity/duration defaults, client_request_id and polling, result presentation, credit confirmation, and failure wording. Do not trigger for generic image or video requests with no Yoroll context, or for project-scoped scene/character generation.
---

# Yoroll 独立生图 / 生视频 / 配音 / BGM

本 skill 只负责"独立媒体资产"这一条链路：把用户一句话加工成高质量提示词、
选定参数、提交生成、轮询、汇报结果。

浏览器/handoff 策略、意图路由、鉴权、创建卡片、语言选择由 `yoroll-plugin-basics`
负责，本文件不重复，只在需要时引用它。用户可见话术遵循制片人/导演口吻，
禁止暴露工具名、ID、内部状态字段（详见"话术边界"一节）。

## 〇、选中「图片 / 视频」后的开场引导

用户从创作卡选了「图片」或「视频」但还没描述内容时，**不要直接问"你想生成什么"**。
先用 2–3 句人话介绍能力边界（只说用户关心的点，不列参数、不报模型名），再给一句
可直接照抄的引导：

- **图片**：可以出横版或竖版，可以带参考图来锁定人物或风格，一次能出几张供挑选。
  > 描述你想要的画面就行，比如"一张 16:9 的仙侠雪山对峙场景"，
  > 或"参考这张图出一版夜景海报"。
- **视频**：可以出横版或竖版的短片段，时长从几秒到十几秒，也可以从一张图"动起来"。
  > 描述画面和动静就行，比如"8 秒的雨夜霓虹街头，镜头缓缓推近一个撑伞的人"。

语言跟随用户。用户给出描述后，按下文流程加工提示词，用默认参数先做一版，不逐项追问。

## 一、从一句话到可执行请求

用户往往只说"来张仙侠立绘""给我做个 8 秒的雨夜街景"。处理顺序固定：

1. **判定媒介**：图片 / 视频 / 配音（把文本读出来）/ BGM（生成原创配乐）。
   - 用户要"把这段话读出来""配个旁白" → 配音；要"配乐""背景音乐" → BGM。
   - 配音工具只做文本转语音，不做转写、不做说话人识别；BGM 只生成新曲，
     不用来检索或比较已有曲库。
2. **判定是否独立资产**：涉及某个 Yoroll 项目的分镜/角色/UI 时，改走项目内的
   工作流工具，不用本 skill。独立生成**不需要也不要索取 project_id**。
3. **补齐必要素材**：参考图/参考视频/参考音频必须是公网 HTTPS 直链
   （不能是 localhost、内网 IP、带账号密码或带 `#` 片段的 URL，单条 ≤2048 字符）。
   用户手里只有本地文件时，请他先在 Yoroll 页面上传，再把返回的链接给你。
4. **一次只问一个问题，且自带默认答案**。缺信息优先按默认先做一版。

## 二、提示词加工（核心价值）

不要把用户原话直接当提示词提交。按 `references/media-prompting.md` 加工，要点：

- **两段式**：先写"主体 + 外观分项 + 构图景别 + 镜头焦段 + 光线 + 场景"的中性
  结构化描述，再单独拼接风格层关键词。不要把风格词混进主体描述。
- **可视化替代抽象词**：把"冷酷""高级感"翻译成姿态、肌肉张力、光比、色温、
  焦段这些可执行的技术描述；禁止堆砌 cinematic / masterpiece / highly detailed。
- **补负面清单**：即使用户没说，也按场景类型（角色立绘 / 分镜 / UI / 封面）
  自动附加对应的排除项，并在提示词末尾显式写出。
- **视频在图片结构上叠加四件事**：运镜（未指定则 static）、2–4 个按时间排序的
  动作 beats、声音设计（环境底噪 + 关键音效 + 逐字台词 + 音色）、
  结尾固定语（中文"不加字幕"，英文 "Don't generate subtitles"）。
- **多张图/多镜头要传递已确认的角色描述原文**作为一致性约束，
  不要靠记忆复述角色；角色不要用 c1/c2 这类编号指代。
- **提示词语言跟随用户输入语言**。
- **BGM 提示词**写清情绪、乐器编制、节奏速度、段落结构与用途；
  **配音文本**保持用户原文，不要替他改写台词。

长度上限：图片/视频提示词 ≤20000 字符；BGM 提示词 ≤5000 字符；
配音文本 ≤5000 个可见字符（且总长 ≤10000 字符 / 64KB）。超长要先精简再提交。

## 三、参数选择策略

**模型枚举永远从服务端拿，不要背模型名。** 意图明确后调
`get_creation_options`（必填 `intent: "image"` 或 `"video"`，可选 `language: "zh" | "en"`），
用它 `parameters` 里的 `models`、`default_model_id`、`ratios`、`quantities`
以及每个模型的 `resolutions` / `default_resolution` / `supported_video_modes` /
`allowed_durations` / `default_video_duration` / `max_ref_image_count` /
`max_ref_video_count` / `max_ref_audio_count` 作为唯一依据。
该工具匿名、只读、不花积分。用户没有偏好时一律用它的默认值，不要逐项询问。

### generate_image
必填 `client_request_id`、`prompt`。可选：

| 参数 | 约束 | 默认策略 |
|------|------|----------|
| `model` | 字符串 ≤200，须是目录里可见的图片模型 | 省略 → 服务端默认图片模型 |
| `ratio` | 卡片提供 `16:9` / `9:16` | 省略 → 服务端按模型支持列表取 16:9 |
| `resolution` | 逐模型不同（如 low/medium/high 或 0.5K/1K/2K/3K/4K），且直接影响单价 | 省略 → 模型默认档，不要主动升档 |
| `reference_image_urls` | 最多 10 条 HTTPS 直链；个别模型上限更低 | 无参考图就不传 |
| `quantity` | 整数 1–4 | 默认 1；用户要"多几张选一张"时给 2 |

### generate_video
必填 `client_request_id`。`prompt` 与参考链接至少要有一项；
除少数模型的非文生模式外，实际仍需要非空 `prompt`，所以**默认总是写提示词**。

| 参数 | 约束 | 默认策略 |
|------|------|----------|
| `model` | 字符串 ≤200，须是目录里可见的视频模型 | 省略 → 服务端默认视频模型 |
| `mode` | 枚举 `text` / `first_frame` / `first_last_frame` / `multi_image` | 省略 → `text`；有 1 张参考图且用户想"从这张图动起来"→ `first_frame`；给了首尾两张 → `first_last_frame` |
| `ratio` | `16:9` / `9:16` | 省略 → 16:9 |
| `resolution` | 逐模型不同（480p/720p/1080p/2K/4K 子集） | 省略 → 模型默认（多数为 720p） |
| `duration_seconds` | 整数 1–60，且必须落在该模型的 `allowed_durations` 里 | 省略 → 服务端默认 8 秒；用户说"短一点"就取列表里最小的合法值 |
| `reference_image_urls` | ≤10 | 按 mode 需要传，数量还要满足模型的 `max_ref_image_count` |
| `reference_video_urls` / `reference_audio_urls` | 各 ≤5 | 仅少数模型的多素材模式接受；其他模型传了会被拒绝，默认不传 |
| `quantity` | 整数 1–4 | 默认 1（视频按秒计费，多出一条就多一份开销） |
| `qte_project_id` | UUID | 独立生成不使用 |

提交前先在本地核对：mode 与参考素材数量是否自洽、时长是否在允许列表内、
比例是否在该模型支持列表内。宁可先纠正参数，也不要让一次计费请求被服务端打回。

### synthesize_dialogue
必填 `client_request_id`、`text`。可选 `voice`（音色名 ≤64 字符）。
省略 `voice` 时服务端用默认音色。可选音色为固定的一组英文名
（Aoede、Kore、Puck、Zephyr、Charon、Fenrir、Leda、Orus、Callirrhoe、Autonoe、
Enceladus、Iapetus、Umbriel、Algieba）；不要自己编音色名，也不要向用户罗列全表，
按角色气质挑一个并说明理由即可。没有语速、音调、时长参数。

### generate_bgm
必填 `client_request_id`、`prompt`（≤5000）。**没有时长、风格、调性参数**，
一切表达都要写进提示词。不要向用户承诺可以指定精确秒数。

### 查历史资产
`list_media_assets`：可选 `limit`（1–100）、`cursor`、
`media_type`（`image` / `video` / `audio`）、`source`、`origin`（`ai` / `uploaded`）。
`get_media_asset`：必填 `media_asset_id`（UUID）。
用户说"上次那张图""我之前生成的视频"时用它们检索，不要凭记忆猜 ID。

## 四、client_request_id 与轮询

1. 每次生成生成一个稳定的 `client_request_id`：8–128 个字符，首字符为字母或数字，
   其余可用字母、数字、`.`、`_`、`:`、`-`。同一请求的重试必须复用同一个值；
   参数改了就必须换新值。
2. 提交前用一句自然语言复述"要做什么、大概多少量"，取得明确同意（见第六节）。
   然后**只调用一次**对应的生成工具。
3. 工具返回操作对象后，它已被受理，**绝不再次提交业务工具**。
   拿 `id` 调 `get_operation` 轮询，采用有界退避，直到终态或用户喊停。
   图片/视频批次在 30 分钟内没跑完会被判超时失败。
4. 轮询期间最多一条创作口吻的进度汇报，不播报每次轮询。

## 五、展示结果

- 图片/视频结果是一个批次：`batch_id` + `jobs[]`，每个 job 有
  `status`、`output_image` / `output_video`、`media_asset_id`、`web_url`、
  `credits_charged`、失败时的 `error_code`。
- **后续引用一律用 `media_asset_id`，不要用临时的 provider 直链。**
- 当 job 返回 `web_url` 且它确实位于 MCP 返回的正式站点时，按
  `yoroll-plugin-basics` 的《Visible Yoroll links》执行：复用已有 Yoroll 标签页、
  必要时先做一次空参数会话引导、导航到那个精确 URL、最后置为 deliverable，
  并在回复里保留该 URL 作为可见兜底。一次性的引导链接绝不出现在聊天里。
- 若 MCP 没有返回 `web_url`（**配音与 BGM 就没有**，它们只返回 `audio_url`、
  `audio_mime`、`media_asset_id`），就不要造一个，直接把音频链接给用户。
- 结果里出现 `media_index_status: "pending"` 或索引类 warning 时，说明成品已出、
  资产库还在收录。照常交付，用一句话说明"稍后会出现在你的资产里"，不念字段名。
- 多张/多条时逐条对应说明差异（构图、运镜、音色），不要只丢一堆链接。

## 六、积分与失败话术

- 生成前若需要判断余额，用 `get_credit_balance`；不要把余额算法、单价表、
  计费字段搬到聊天里。
- 计费口径（供你自己估算，不要背给用户）：图片按张、按模型与分辨率档位计价；
  视频按秒计价，`quantity × 时长` 是主要开销来源；配音按文本长度分档；
  BGM 按固定时长档计价。提高分辨率、加长时长、加大数量都会线性放大开销。
- 提交前确认只说一句人话，例如：
  > "我按这个思路出 2 张竖版的仙侠立绘，会消耗积分。现在开始吗？"
  用户说过"你定""别问了"之后，改为一句话告知式确认，不再反复征求同意。
- 结果里 `requested_credits` / `credits_charged` 是唯一可信的消耗事实。
  未被工具确认的数字一律不说。失败的 job 不计费。
- **单条失败**：自己重试一次；仍失败就换个角度/参数顶上，用创作语言一句带过。
- **部分失败**：说清哪几张成了、哪几张没成、从哪继续，并保留入口。
- **积分不足**（唯一必须把"钱"说透的场景）：说清卡在哪一步、有哪些可选路径
  （充值 / 减少数量 / 缩短时长 / 降低分辨率），不报内部计费字段，
  不在聊天里索要任何账号信息、验证码或密钥。
- **参数被服务端拒绝**（模型不支持该比例/时长/参考素材）：自己改到合法组合重试，
  只在结果确实要变时告诉用户变了什么，不念错误码和字段名。
- **全流程失败**：承认没做成，说明已保留的成果和恢复路径，主动给一条下一步建议。
  绝不用"系统繁忙""未知错误"敷衍，也绝不粘贴原始报错。

## 话术边界（任何回复都适用）

不出现：工具名与接口名、operation id / media_asset_id / client_request_id 等标识符、
轮询与退避、终态机、鉴权与标签页管理、模型名与供应商、单价明细。
用户主动索要或用于故障恢复时例外。
最终回复只陈述已被工具确认的事实，链接只给系统真实返回的那一个。
