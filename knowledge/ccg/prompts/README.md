# CCG Prompts

## 文件说明

| 文件 | 用途 | 加载方式 |
|------|------|---------|
| system_prompt.md | 主 system prompt（20 个 section） | `backend/src/constants/prompts.ts` 的 `getCCGGamePrompt()` 读取，注入到 CC 的 `getSystemPrompt()` 返回数组中 |
| subagent_world_builder.md | world-builder subagent prompt | `backend/.claude/agents/world-builder.md` 引用 |
| subagent_asset_generator.md | asset-generator subagent prompt | `backend/.claude/agents/asset-generator.md` 引用 |
| subagent_gameplay_programmer.md | gameplay-programmer subagent prompt | `backend/.claude/agents/gameplay-programmer.md` 引用 |
| subagent_qa_playtester.md | qa-playtester subagent prompt | `backend/.claude/agents/qa-playtester.md` 引用 |

## 动态注入

`system_prompt.md` 末尾有 `{{}}` 占位符，运行时由 `getCCGGamePrompt()` 读取项目根目录的 `CCG.md` 文件并替换：
- `{{PROJECT_ROOT}}` → process.cwd()
- `{{ENGINE_VERSION}}` → CCG.md 中的 Engine 字段
- `{{MAIN_SCENE}}` → CCG.md 中的 Main Scene 字段
- 等 12 个占位符
