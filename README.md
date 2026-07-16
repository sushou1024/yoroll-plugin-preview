# Yoroll MCP Developer Preview

This repository distributes the test-only Yoroll plugin for Codex. The plugin uses the OAuth-protected Yoroll MCP server for every account, project, workflow, media, operation, and publishing action. Codex's built-in Browser is a read-only display surface.

## Environment boundary

This preview is intentionally fixed to:

- MCP: `https://mcp.yoroll.ai/mcp`
- Web: `https://dev.yoroll.ai`
- API behind MCP/Web: Yoroll test services

Do not repoint it to `app.yoroll.ai` or a production API. Project and image/video navigation URLs come from MCP responses.

## OAuth configuration

The preview ships a plugin `.mcp.json` with Streamable HTTP, `auth: "oauth"`, the MCP resource, and one complete consent bundle:

```text
account:read credits:read projects:read projects:write
publish:read publish:write media:image media:video media:audio media:read
operations:read operations:write web:session
```

Codex keeps the OAuth tokens. They never enter the Browser or chat.

## Browser-first pairing

When an authenticated Yoroll page is needed, the Skill performs this sequence:

1. Open the fixed, credential-free page `https://dev.yoroll.ai/auth/mcp-connect`.
2. Read its machine-readable pairing code from the DOM.
3. Call MCP `approve_browser_session({pairing_code})` directly.
4. Wait while the page polls and claims its HttpOnly Browser session.
5. Navigate separately to an ordinary project or image/video `web_url`.

The user is never asked to copy the pairing code or sign in a second time. The code is an authentication handle, not a project/media target or redirect.

## Tool surface: 40+1

| Area | Count | Purpose |
| --- | ---: | --- |
| Account | 2 | Login/account status and credit balance |
| Project reads | 7 | Projects, status, story, characters, plot, and scenes |
| Project writes | 19 | Creation, focused edits, generation stages, and asset selection |
| Publishing | 3 | Status, validation preflight, and publication |
| Standalone media/library | 6 | Image, video, dialogue speech, BGM, and durable media lookup |
| Operations | 3 | Poll, recover, and cancel supported work |
| Browser pairing | +1 | Approve the Browser's target-independent pairing code |

Important behavior:

- All workflow edits use MCP. The Browser remains read-only.
- Standalone image, video, speech, and BGM generation never requires a project ID.
- Image and video results may provide an ordinary tab `web_url`; audio results do not. Do not invent an audio page.
- `expected_updated_at` is an optional test-preview stale-state preflight. It is not a revision, lock, or compare-and-swap guarantee.
- Credit-consuming, destructive, and publishing actions require confirmation.

The exact tool names and operating rules live in [`SKILL.md`](./plugins/yoroll-test-plugin/skills/yoroll-plugin-basics/SKILL.md).

## Repository layout

```text
.agents/plugins/marketplace.json
plugins/yoroll-test-plugin/
  .codex-plugin/plugin.json
  .mcp.json
  assets/
  skills/yoroll-plugin-basics/
    SKILL.md
    agents/openai.yaml
```

This developer preview uses `.mcp.json`. A future Hosted App integration would use `.app.json`; no Hosted App manifest is included in this preview.

## Install or update

```bash
codex plugin marketplace add https://github.com/sushou1024/yoroll-plugin-preview.git --ref main
codex plugin marketplace upgrade ennio-yoroll-preview
codex plugin add yoroll-test-plugin@ennio-yoroll-preview
```

Restart the Codex desktop app and start a new task after installation or update. OAuth is requested during installation. Never paste Yoroll credentials, consent codes, or tokens into chat.

See [INSTALL.md](./INSTALL.md) for verification and troubleshooting.

## Development validation

From the built-in `plugin-creator` skill directory:

```bash
python3 scripts/validate_plugin.py \
  /absolute/path/to/yoroll-plugin-preview/plugins/yoroll-test-plugin

python3 ../skill-creator/scripts/quick_validate.py \
  /absolute/path/to/yoroll-plugin-preview/plugins/yoroll-test-plugin/skills/yoroll-plugin-basics
```

The test MCP endpoint should also pass:

```bash
curl -fsS https://mcp.yoroll.ai/healthz
curl -fsS https://mcp.yoroll.ai/.well-known/oauth-protected-resource/mcp
```

Privacy policy: <https://docs.yoroll.ai/yoroll-privacy-policy>

Terms of use: <https://docs.yoroll.ai/yoroll-terms-of-use>
