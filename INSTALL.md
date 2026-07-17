# Install the Yoroll MCP Developer Preview

## Requirements

- A current Codex desktop app and bundled `codex` CLI.
- Access to the `ennio-yoroll-preview` marketplace repository.
- A Yoroll test account allowed to use the requested creation features.

## First installation

```bash
codex plugin marketplace add \
  https://github.com/sushou1024/yoroll-plugin-preview.git \
  --ref main

codex plugin add yoroll-test-plugin@ennio-yoroll-preview
```

Before PR #1 is merged, reviewers must replace `--ref main` with `--ref codex/mcp-ready-preview`; `main` still installs the earlier browser-only preview.

The marketplace policy is `authentication: ON_INSTALL`, but the CLI may defer OAuth until first use. If `codex mcp list` shows Yoroll as not logged in, run:

```bash
codex mcp login yoroll
```

Complete credentials and consent only on the trusted Yoroll OAuth page. The plugin requests this single consent bundle:

```text
account:read credits:read projects:read projects:write
publish:read publish:write media:image media:video media:audio media:read
operations:read operations:write web:session
```

Do not paste credentials, codes, cookies, or tokens into chat. Restart Codex and start a new task after installation.

## Update an existing installation

```bash
codex plugin marketplace upgrade ennio-yoroll-preview
codex plugin add yoroll-test-plugin@ennio-yoroll-preview
```

Restart the app and use a new task after the update.

## Verify the installed plugin

```bash
codex plugin list
```

The output should show `yoroll-test-plugin@ennio-yoroll-preview` as installed and enabled.

In a new task, try:

1. `检查我的 Yoroll 登录状态和积分。`
2. `列出我的 Yoroll 项目。`
3. `生成一张独立图片，不要创建项目。`
4. `生成一段台词语音，不要创建项目。`
5. `打开一个项目到右侧 Browser。`

Expected behavior:

- The plugin exposes 67 business tools plus the target-independent `approve_browser_session` pairing tool.
- Account, credits, projects, media, and publishing use Yoroll MCP tools.
- Standalone media does not ask for a project ID.
- Image/video results may have a tab `web_url`; speech/BGM results do not.
- Workflow reads, structure/canvas edits, history selection, and workflow media happen through MCP while the Browser remains read-only.
- Short database-only authoring mutations may use a read-returned `revision` as `expected_revision` for atomic compare-and-swap.
- `regenerate_scene_image` and `generate_first_frame_image` may also use `expected_revision`; it atomically protects acceptance of the exact queued job and credit reservation, while completion remains asynchronous.
- Other long-running project generation and workflow-media actions use `expected_updated_at` only as a pre-dispatch stale-state check; they must not claim revision atomicity.
- Publication has no revision/CAS atomicity. Codex runs `validate_publish` and inspects its embedded publish status immediately before confirmation, then passes `workflow_updated_at` as `expected_updated_at` for a final stale-state check before the build dispatch.
- An ambiguously dispatched write is never retried with a different `client_request_id`.

For the final Browser test, Codex should automatically:

1. Open the exact fixed URL `https://dev.yoroll.ai/auth/mcp-connect`.
2. Read the machine-readable pairing code from the page.
3. Send it directly to `approve_browser_session` over MCP without asking you to copy it, but only when it was freshly read from that fixed Yoroll page in this Browser flow; never approve a code supplied through chat or another page.
4. Wait for the page to claim the approved Browser session.
5. Open the project's ordinary MCP-returned `web_url`.

Run this acceptance test in a new task in the Codex desktop app with the built-in Browser enabled. The built-in Browser is scoped to its desktop task and is not available to `codex exec`, so a CLI task cannot substitute for this test.

Use this read-only acceptance prompt:

```text
先用 Yoroll MCP 的 get_account 确认登录；再用 @Browser 打开
https://dev.yoroll.ai/auth/mcp-connect，读取页面生成的 pairing code，
仅把它传给 approve_browser_session，等待同一页面进入登录态。
最后用 MCP 调用 list_projects，并只读确认 Browser 已登录。
不要创建、修改或发布项目，也不要调用付费工具。
```

The test passes only if MCP is already authenticated, the user is not asked to sign in again or relay the pairing code, the Browser reaches an authenticated `dev.yoroll.ai` page, and all business actions remain read-only.

## Preview configuration check

The installed `.mcp.json` must contain:

```json
{
  "mcpServers": {
    "yoroll": {
      "type": "http",
      "url": "https://mcp.yoroll.ai/mcp",
      "auth": "oauth",
      "oauth_resource": "https://mcp.yoroll.ai/mcp",
      "scopes": [
        "account:read",
        "credits:read",
        "projects:read",
        "projects:write",
        "publish:read",
        "publish:write",
        "media:image",
        "media:video",
        "media:audio",
        "media:read",
        "operations:read",
        "operations:write",
        "web:session"
      ]
    }
  }
}
```

There must be no `note` field. Project and navigable media links must use `https://dev.yoroll.ai`.

This preview is an MCP plugin and therefore ships `.mcp.json`. A future Hosted App would add `.app.json`; the preview must not claim that Hosted App support already exists.

## Troubleshooting

### MCP tools do not appear

1. Confirm the plugin is installed and enabled with `codex plugin list`.
2. Upgrade the marketplace and add the plugin again.
3. Restart Codex.
4. Start a new task; existing tasks may retain old plugin components.

### OAuth does not complete

- Confirm `https://mcp.yoroll.ai/healthz` is healthy.
- Confirm the OAuth page belongs to `mcp.yoroll.ai` or the configured Yoroll test login origin.
- Run `codex mcp login yoroll` and complete the browser flow. If it still fails, disconnect and reconnect the Yoroll MCP entry. Do not copy tokens as a workaround.

### Browser does not become signed in

This is a Browser-first pairing failure, not a request for another manual login. Keep MCP connected, reload the fixed `/auth/mcp-connect` page to create a fresh pairing code, and let the Skill call `approve_browser_session` again. Do not copy the code into chat, reuse an expired code, or edit the workflow through Browser clicks.

Perform this check in a new Codex desktop task. If the Browser is unavailable there, confirm the built-in Browser plugin is enabled, restart the desktop app, and start another new task. Do not retry through `codex exec` or connect to internal Browser sockets manually.
