---
name: amentoi-cli
description: Use the Amen Toi CLI to manage Link pages, Forms, submissions and permitted service tools with a workspace API key.
---

# amentoi-cli

Use `amentoi-cli` when the user asks to manage Amen Toi content or read its statistics. Always use `--json` for programmatic calls. Read `amentoi-cli --help` and `amentoi-cli <resource> --help` before using an unfamiliar command.

## Setup

Install Bun, then install the release or run `npx api2cli install t0piCyb/amentoi-cli`. Configure Core and product API origins with `amentoi-cli config set <service> <https-url>`. Supported services are core, link, forms, and people.

Create a scoped workspace API key in Core. Pipe it to `amentoi-cli auth set` or set `AMENTOI_API_KEY`. Never print the key or pass it as a command argument in a shared shell. Run `amentoi-cli auth test --json`.

The shared key can omit an expiry, but remains revocable. The CLI exchanges it through Core for a five-minute product token. A service may return 403 if the workspace, key scope, creator role, installation, or entitlement lacks access. Do not retry denied actions with a different user's credentials.

## Resources

| Resource | Commands |
| --- | --- |
| `pages` | `list`, `get`, `create`, `update`, `publish`, `stats` |
| `blocks` | `create`, `update`, `delete`, `window`, `image`, `thumbnail` |
| `forms` | `list`, `get`, `create`, `update`, `publish`, `stats` |
| `submissions` | `list`, `get` |
| `tools` | `list <service>`, `call <service> <tool-name>` |
| `api` | `call <service> <method> </v1/path>` |

Examples:

```bash
amentoi-cli pages list --json
amentoi-cli pages create --slug mon-profil --title 'Mon profil' --json
amentoi-cli blocks create PAGE_ID --type LINK --data '{"url":"https://example.com","label":"Site"}' --json
amentoi-cli pages stats PAGE_ID --days 30 --json
amentoi-cli forms create --file form.json --json
amentoi-cli submissions list FORM_ID --json
```

Use `api call` for existing operations not yet wrapped as resource commands. Use `--data` or `--file` for JSON bodies. `--json` yields an `{ok,data,meta}` envelope. `--format csv` and `--format yaml` are available for suitable responses. Exit 0 means success; a nonzero code means usage or API failure.

Songs and Liturgy do not currently have Core key-session routes. Production Core must deploy the exchange route before product API key commands work there.
