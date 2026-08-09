# IAB 内登录方案（V1）——授权链路整体复盘与设计

日期：2026-08-09 · 状态：待后端（MCP 模块）评审
目标：**登录在 Codex 内置浏览器（IAB）里完成，登录即全权，对话自动继续，全程无断点。**

## 一、现状为什么是断的（复盘）

现有链路 = 标准 OAuth（Codex 持有 token）+ handoff 只读投影，实测断点：

| # | 断点 | 根因 |
|---|---|---|
| 1 | 受保护工具被拒后，Codex **该弹授权窗没弹**（实测 v3-dev；服务端挑战字段/发现端点/动态注册已逐一验证正常且与生产一致） | Codex 宿主行为，我们不可控 |
| 2 | 即使弹了，授权发生在**系统浏览器**，脱离 IAB，体验割裂 | OAuth 回调必须回到 Codex（PKCE code_verifier 在宿主手里），弹窗位置由宿主决定 |
| 3 | 授权后 IAB 还要靠 `create_browser_handoff` 换**只读**投影会话，看得见改不了、也付不了款 | 只读投影的存在前提就是"登录发生在 IAB 之外" |
| 4 | `codex mcp login` 可手动补救，但同样开系统浏览器，且不打印授权 URL（实测），无法截获转入 IAB | CLI 行为 |

结论：只要 token 由宿主持有，授权页开在哪就由宿主说了算——**这条路的 UX 上限被宿主锁死了**。

## 二、业界实践对照

- **chatfate（已验证可用）**：不用宿主 OAuth。未登录时工具返回带 ticket 的登录链接 → Agent 开在 IAB → 用户登录，授权绑定在服务端 → Agent 轮询重试原工具，登录完成即续跑。凭据不经过宿主。其会话相关性靠工具入参里的 session id（对话可见）。
- **MCP 传输规范**：Streamable HTTP 有标准的 **`Mcp-Session-Id` 会话头**——服务端在 initialize 时分配，客户端此后每个请求自动携带；它在 HTTP 传输层，**模型完全不可见**。这正是"会话相关性"更干净的载体（对比 chatfate 的入参方案）。
- **OpenAI Apps SDK 指引**：widgetState/对话上下文不放任何凭据；宿主 OAuth 的 token 对 widget 亦不可见——印证"凭据不进对话"应作为硬约束保留。

## 三、V1 设计：MCP 会话绑定 + ticket 登录 + 长轮询

**一句话：把 chatfate 的登录体验，架在 MCP 标准会话头上。**

```
1. 新会话 initialize → 服务端（会话模式）分配 Mcp-Session-Id，Codex 自动在后续所有请求携带
2. 未授权调用受保护工具 → 返回 login_url（绑定当前 MCP 会话的一次性 ticket，10 分钟有效）
3. Agent 把 login_url 开在 IAB → dev.yoroll.ai 登录页（现成）
   · 首次：正常登录 + 点一次「授权此对话」
   · 之后：浏览器 cookie 尚在 → 页面只剩一键「授权此对话」（显式点击防会话固定攻击，不做零点击）
4. 服务端把平台会话铸成【全权】MCP 授权，绑定到该 Mcp-Session-Id（Redis）
5. Agent 调 wait_for_login 长轮询（服务端攥单 ≤20s，pending 则同参重调）→ 授权完成即返回
6. Agent 重试原工具 → 成功，对话续跑。用户全程零输入
```

**随之消失的复杂度**：登录后 IAB 持有的是**真实的** dev.yoroll.ai 登录态（浏览器 cookie），看、改、充值、支付全部直接可用——`create_browser_handoff` / 只读投影 / pairing 整条机制在此链路下不再需要（保留兼容旧客户端）。

## 四、安全边界（保留的与放弃的）

保留：
- **凭据不进对话**：会话相关性走 `Mcp-Session-Id`（传输层），ticket 单次使用短时效，对话里只出现过一个一次性登录 URL（打开即作废）
- **绑定需显式点击**（防他人 ticket 被诱导打开后静默绑走账号）
- 花积分/发布前确认（skill 既有行为）、服务端限流、授权可撤销（网页登出 / TTL）

放弃（经产品决策）：
- 分级授权——登录即全权，与现行 OAuth 的 scope 范围一致，不加码

## 五、改动清单与开放问题

后端（mcpauth / mcp-server 模块，估 2–3 人日）：
1. `Stateless: true → false`（go-sdk 原生支持会话模式）
2. mcpauth 新增：ticket 签发（绑 Mcp-Session-Id）、登录页回调铸 grant、grant 按会话解析（与现有 Bearer 解析并存）
3. 新工具 `wait_for_login`（长轮询，复用 wait_for_creation_intent 的实现模式）
4. 未授权错误里附带 login_url
5. 前端登录页加「授权此对话」确认位（一小块 UI）

插件侧（跟进）：basics skill 的授权节改写为"开 login_url 于 IAB → wait_for_login → 重试"；删除 handoff 引导。

开放问题（需 Jack 定）：
- **多副本**：go-sdk 会话表在进程内存，v3-dev 单副本无碍；生产多副本需会话亲和（ALB 粘性或单独小规格 MCP 服务）——先在 v3-dev 验证，生产部署形态另议
- **Codex 对 Mcp-Session-Id 的回传**：规范要求客户端必须携带；Codex 为第一方旗舰客户端，预期合规，但需在 v3-dev 开会话模式后实测确认（若不合规，回退方案是 chatfate 式入参会话，牺牲"凭据不进对话"）
- 与现有 OAuth 的关系：并存（`codex mcp login` 仍可用），ticket 流为默认体验
