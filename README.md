# amentoi-cli

One CLI for the Amen Toi services. A workspace API key is exchanged through Core for a five-minute service token. The service checks its own permissions and subscription features on every command.

## Install

```bash
npm install -g https://github.com/t0piCyb/amentoi-cli/releases/download/v0.1.0/amentoi-cli-0.1.0.tgz
amentoi --help
```

Create a workspace API key in Core with the scopes needed by your tasks. Omit `expiresAt` for a key that does not expire. It remains revocable. Keep its secret private; Core shows it only at creation.

```bash
amentoi config set core https://YOUR-CORE-API
amentoi config set link https://link.amentoi.com
amentoi config set forms https://forms.amentoi.com
printf '%s' "$AMENTOI_API_KEY" | amentoi auth save
amentoi auth status
```

The configuration file is stored at `~/.config/amentoi/cli.json` with mode `0600`. You can instead use `AMENTOI_API_KEY` and `AMENTOI_<SERVICE>_URL` environment variables. The key is sent only to Core; product services receive a short session.

## Examples

```bash
amentoi link create mon-profil 'Mon profil'
amentoi link add PAGE_ID https://example.com 'Mon site'
amentoi link publish PAGE_ID
amentoi link window PAGE_ID BLOCK_ID 2026-10-01T09:00:00+02:00 2026-10-31T23:59:00+01:00
amentoi link image PAGE_ID https://example.com --output preview.webp
amentoi link thumbnail PAGE_ID BLOCK_ID --file preview.webp
amentoi link publish PAGE_ID
amentoi link stats PAGE_ID --days 30
amentoi forms create 'Contact' contact --file schema.json
amentoi forms publish FORM_ID
amentoi forms responses FORM_ID --limit 50
amentoi forms stats
amentoi tools people
amentoi tool people list_people --data '{}'
amentoi api link GET /v1/link/pages
```

`amentoi api` exposes each service's existing `/v1` operations without claiming an endpoint that service has not implemented. `amentoi tools` discovers available tools on services that publish a tool registry. A 403 means the key lacks a permission or feature; a 404 may mean the resource is outside the key's workspace.
