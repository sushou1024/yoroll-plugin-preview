# Install the Yoroll MCP Developer Preview

## Requirements

- A current Codex desktop app and bundled `codex` CLI.
- Access to the `ennio-yoroll-preview` marketplace repository.
- A Yoroll test account for protected creation and project operations.

## Install or update

```bash
codex plugin marketplace add \
  https://github.com/sushou1024/yoroll-plugin-preview.git \
  --ref main

codex plugin marketplace upgrade ennio-yoroll-preview
codex plugin add yoroll-test-plugin@ennio-yoroll-preview
```

Restart Codex and start a new task after installation or update. Verify the
installation with:

```bash
codex plugin list
```

The marketplace uses `authentication: ON_USE`. Opening the public intent card
or a detailed settings card must not start OAuth. Yoroll OAuth should begin only
after the first protected account, project, generation, editing, or publishing
tool is called.

Never paste Yoroll credentials, verification codes, cookies, consent codes, or
tokens into chat. If automatic linking needs manual diagnosis, use:

```bash
codex mcp login yoroll
```

Complete sign-in only on the trusted Yoroll authorization page.

## Acceptance test

Run these prompts in a new Codex desktop task:

1. `Yoroll 可以帮我做什么？先不要登录。`
2. Select `图片` in the intent card and confirm that a second settings card appears.
3. Fill the image card and submit it.
4. Complete OAuth only when the protected `generate_image` call starts.
5. `用 Yoroll 创建互动影游。` Confirm that Codex skips the intent card and opens the interactive-game settings card directly.

Expected behavior:

- `render_creation_menu` and `render_creation_form` run anonymously.
- The first card offers interactive game, image, video, and other request.
- The second card contains the detailed settings for the selected intent.
- Submitting calls the existing focused business tool; there is no generic
  submit endpoint or duplicate business implementation.
- Paid, destructive, and publishing actions keep their existing confirmation,
  idempotency, operation polling, and OAuth rules.
- The flow does not open `/auth/mcp-connect`, pair a Browser, or automate the
  platform frontend.
- All URLs and data stay in the Yoroll test environment.

## Preview boundary

The installed `.mcp.json` is fixed to:

```text
https://mcp.yoroll.ai/mcp
```

It requests the business scopes required by the existing tools, but not the
legacy `web:session` pairing scope. The preview must never be repointed to
`app.yoroll.ai`, `api.lineargame.ai`, or another production origin.

## Troubleshooting

### MCP tools do not appear

1. Run `codex plugin marketplace upgrade ennio-yoroll-preview`.
2. Re-add the plugin.
3. Restart Codex and start a new task; existing tasks may retain old plugin components.

### A public card starts OAuth

Confirm the deployed server lets an anonymous client initialize and that both
render tools advertise exactly `[{"type":"noauth"}]`. Also confirm the
marketplace entry says `authentication: ON_USE`.

### A protected call does not start OAuth

Confirm the tool advertises its `oauth2` scope and returns
`_meta["mcp/www_authenticate"]` when no valid token is present. Do not work
around the issue with Browser login or token copying.
