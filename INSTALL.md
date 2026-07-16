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

The marketplace policy is `authentication: ON_INSTALL`. Complete credentials and consent only on the trusted Yoroll OAuth page. The plugin requests this single consent bundle:

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

- Account, credits, projects, media, and publishing use Yoroll MCP tools.
- Standalone media does not ask for a project ID.
- Image/video results may have a tab `web_url`; speech/BGM results do not.
- Workflow edits happen through MCP while the Browser remains read-only.
- `expected_updated_at`, when used, is described only as a test-preview stale-state preflight—not a revision or CAS token.

For the final Browser test, Codex should automatically:

1. Open the exact fixed URL `https://dev.yoroll.ai/auth/mcp-connect`.
2. Read the machine-readable pairing code from the page.
3. Send it directly to `approve_browser_session` over MCP without asking you to copy it.
4. Wait for the page to claim the approved Browser session.
5. Open the project's ordinary MCP-returned `web_url`.

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
- Disconnect and reconnect the Yoroll MCP entry. Do not copy tokens as a workaround.

### Browser does not become signed in

This is a Browser-first pairing failure, not a request for another manual login. Keep MCP connected, reload the fixed `/auth/mcp-connect` page to create a fresh pairing code, and let the Skill call `approve_browser_session` again. Do not copy the code into chat, reuse an expired code, or edit the workflow through Browser clicks.
