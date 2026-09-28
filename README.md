# amentoi-cli

An [api2cli](https://api2cli.dev/docs/create-cli) scaffold adapted for the Amen Toi multi-service API. Commands are organized by resource, have help at every level, and support `--json` for agent workflows. The shared workspace API key is sent only to Core. Core exchanges it for a five-minute, audience-bound token for Link, Forms, or People. Each service still checks its own permissions and entitlements.

## Install

[Bun](https://bun.sh/) is required for the api2cli binary. Download the release package:

```bash
npm install -g https://github.com/t0piCyb/amentoi-cli/releases/download/v0.2.0/amentoi-cli-0.2.0.tgz
amentoi-cli --help
```

The repository also has `skills/amentoi-cli/SKILL.md` for agents and can be installed by `npx api2cli install t0piCyb/amentoi-cli` once the repository is published.

## Configure

```bash
amentoi-cli config set core https://api.dev.amentoi.com
amentoi-cli config set link https://link.dev.amentoi.com
amentoi-cli config set forms https://forms.dev.amentoi.com
amentoi-cli config set people https://people.dev.amentoi.com
printf '%s' "$AMENTOI_API_KEY" | amentoi-cli auth set
amentoi-cli auth test --json
```

Create the key in Core for the right workspace and scopes. If `expiresAt` is omitted at creation, the key does not expire automatically; it can still be revoked or rotated. The five-minute service tokens are never saved. The CLI checks `AMENTOI_API_KEY` first, then `~/.config/tokens/amentoi-cli.txt` (mode 0600), then the previous `~/.config/amentoi/cli.json` key. Service URLs can also come from `AMENTOI_<SERVICE>_URL` environment variables.

Core currently has key-session routes for Link, Forms, and People in staging. Songs and Liturgy do not have key-session routes. Production requires deploying the Core key-session endpoint before these commands can authenticate there. A key's effective permissions are the intersection of its creation-time permissions, current creator permissions, requested scopes, and product installation/entitlement.

## Commands

```bash
amentoi-cli pages list --json
amentoi-cli pages create --slug mon-profil --title 'Mon profil' --json
amentoi-cli pages get PAGE_ID --json
amentoi-cli blocks create PAGE_ID --type LINK --data '{"url":"https://example.com","label":"Site"}' --json
amentoi-cli blocks window PAGE_ID BLOCK_ID --from 2026-10-01T09:00:00Z --until null --json
amentoi-cli blocks image PAGE_ID --url https://example.com/image.png --output preview.webp --json
amentoi-cli blocks thumbnail PAGE_ID BLOCK_ID --file preview.webp --json
amentoi-cli pages publish PAGE_ID --json
amentoi-cli pages stats PAGE_ID --days 30 --json
amentoi-cli forms create --file form.json --json
amentoi-cli forms publish FORM_ID --json
amentoi-cli submissions list FORM_ID --limit 50 --json
amentoi-cli forms stats --json
amentoi-cli tools list people --json
amentoi-cli api call link GET /v1/link/pages --json
```

`form.json` is the full API body with `name`, `slug`, and `schema`. Run `amentoi-cli <resource> <action> --help` for each action's flags and examples.

The `amentoi` binary from v0.1.0 remains available for existing scripts. The `amentoi-cli` binary is the api2cli-based interface. Core and each product service enforce permissions; `--json` returns `{ "ok": true, "data": ..., "meta": ... }` or a structured error and a nonzero exit code.
