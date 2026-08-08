# 原料来源记录

本目录内容拷贝自 CCG 仓库（Yoroll Code），仅作为改造原料，**不随插件安装分发**。

- 源仓库：github.com/LinearGameAI/CCG（本地 /Users/ennio/xxx/ccg）
- 源分支：test（唯一活跃主线）
- 源 commit：`23746420`（2026-08-07 fix(files): 修复会话附件列表崩溃）
- 拷贝日期：2026-08-08
- 拷贝内容：
  - `agent-skills/` → `knowledge/ccg/agent-skills/`（6 个 SKILL.md：game-design / godot-implementation / unity-implementation / h5-implementation / media-pipeline / delivery-validation）
  - `docs/prompts/` → `knowledge/ccg/prompts/`（主系统提示词 ×2 + 4 个子 agent 提示词）

同步方式：CCG test 分支更新后，对照上述 commit 做增量 diff 再决定是否回灌。
