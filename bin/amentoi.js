#!/usr/bin/env node
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const configPath = process.env.AMENTOI_CONFIG ?? join(homedir(), '.config', 'amentoi', 'cli.json')
const services = new Set(['core', 'link', 'forms', 'people'])
const isService = (service) => /^[a-z][a-z0-9]{2,23}$/.test(service ?? '') && !['identity', 'billing'].includes(service)
const productionUrls = { core: 'https://api.amentoi.com', link: 'https://link-api.amentoi.com', forms: 'https://forms-api.amentoi.com', people: 'https://people-api.amentoi.com' }
const usage = `amentoi-cli

  amentoi config set <service> <https://api-origin>
  amentoi auth save                   Read the shared API key from stdin
  amentoi auth status                 Verify key against Core
  amentoi workspaces list             List workspaces available to this key
  amentoi workspaces use <id-or-slug>  Save the active workspace
  amentoi workspaces current          Show the active workspace
  amentoi services                    Show configured services
  amentoi tools <service>             Discover permitted tools
  amentoi tool <service> <name> [--data JSON | --file PATH]
  amentoi api <service> <METHOD> <PATH> [--data JSON | --file PATH]
  amentoi link pages
  amentoi link create <slug> <title>
  amentoi link publish <page-id>
  amentoi link add <page-id> <url> <label>
  amentoi link stats <page-id> [--days N]
  amentoi link window <page-id> <block-id> <from-ISO|null> <until-ISO|null>
  amentoi link image <page-id> <url> --output PATH [--kind auto|icon|image]
  amentoi link thumbnail <page-id> <block-id> --file PATH
  amentoi forms list
  amentoi forms create <name> <slug> --file schema.json
  amentoi forms publish <form-id>
  amentoi forms responses <form-id> [--limit N] [--cursor CURSOR]
  amentoi forms stats
  amentoi people list [--query TEXT]
  amentoi people get <person-id>
  amentoi people overview
  amentoi people stats [--days N]

Global: --workspace <id> overrides the saved workspace for one command.
Environment: AMENTOI_API_KEY, AMENTOI_WORKSPACE_ID, AMENTOI_<SERVICE>_URL, AMENTOI_CONFIG.
All output is JSON. API keys have no expiry when created without expiresAt, but can be revoked.
`

async function loadConfig() {
  try { return JSON.parse(await readFile(configPath, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return { urls: {} }; throw error }
}

async function saveConfig(config) {
  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 })
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 })
  await chmod(configPath, 0o600)
}

function urlFor(config, service) {
  if (!isService(service)) throw new Error(`Unknown service: ${service}`)
  const raw = process.env[`AMENTOI_${service.toUpperCase()}_URL`] ?? config.urls?.[service] ?? productionUrls[service]
  const url = new URL(raw)
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('Service URL must use HTTPS')
  }
  return url.origin
}

function valueOption(args, name) {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`)
  return value
}

async function payload(args) {
  const data = valueOption(args, '--data')
  const file = valueOption(args, '--file')
  if (data && file) throw new Error('Choose --data or --file')
  if (file) return JSON.parse(await readFile(file, 'utf8'))
  return data ? JSON.parse(data) : undefined
}

async function call(url, path, init = {}, binary = false) {
  const response = await fetch(new URL(path, `${url}/`), { ...init, redirect: 'error' })
  const body = response.ok && binary ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const code = body?.error?.code ?? response.status
    throw new Error(`${response.status} ${code}: ${body?.error?.message ?? response.statusText}`)
  }
  return binary ? { bytes: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get('content-type') } : body
}

async function main(args) {
  if (args.length === 0 || args.includes('--help') || args[0] === 'help') { process.stdout.write(usage); return }
  if (args.includes('--version')) { process.stdout.write('0.3.0\n'); return }
  const workspaceOverride = valueOption(args, '--workspace')
  if (workspaceOverride) args = args.filter((value, index) => value !== '--workspace' && args[index - 1] !== '--workspace')
  const config = await loadConfig()
  const workspaceId = workspaceOverride ?? process.env.AMENTOI_WORKSPACE_ID ?? config.workspaceId
  const coreHeaders = (key) => ({ 'x-api-key': key, ...(workspaceId ? { 'x-amen-workspace-id': workspaceId } : {}) })
  const [command, action, ...rest] = args
  if (command === 'config' && action === 'set') {
    const [service, raw] = rest
    if (!isService(service) || !raw) throw new Error('Usage: amentoi config set <service> <url>')
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') throw new Error('HTTPS required')
    config.urls ??= {}
    config.urls[service] = url.origin
    await saveConfig(config)
    return
  }
  if (command === 'auth' && action === 'save') {
    if (process.stdin.isTTY) throw new Error('Pipe the key through stdin to avoid shell history')
    let secret = ''
    for await (const chunk of process.stdin) secret += chunk
    secret = secret.trim()
    if (!/^amen_sk_(live|test)_[a-z2-7]{12}_[a-z2-7]{32}$/.test(secret)) throw new Error('Invalid Amen API key')
    config.apiKey = secret
    await saveConfig(config)
    return
  }
  if (command === 'services') {
    console.log(JSON.stringify([...new Set([...services, ...Object.keys(config.urls ?? {})])].filter((service) => {
      try { urlFor(config, service); return true } catch { return false }
    }), null, 2))
    return
  }
  const key = process.env.AMENTOI_API_KEY ?? config.apiKey
  if (!key) throw new Error('Set AMENTOI_API_KEY or use amentoi auth save')
  const coreUrl = urlFor(config, 'core')
  if (command === 'auth' && action === 'status') {
    console.log(JSON.stringify(await call(coreUrl, '/v1/key-workspaces', { headers: coreHeaders(key) }), null, 2))
    return
  }
  if (command === 'workspaces') {
    if (action === 'current') { console.log(JSON.stringify({ data: { workspaceId: workspaceId ?? null } }, null, 2)); return }
    const listed = await call(coreUrl, '/v1/key-workspaces', { headers: coreHeaders(key) })
    if (action === 'list') { console.log(JSON.stringify(listed, null, 2)); return }
    if (action === 'use') {
      const matches = listed.data.filter((workspace) => workspace.id === rest[0] || workspace.slug === rest[0])
      if (matches.length !== 1) throw new Error(matches.length === 0 ? 'Workspace is not available to this key' : 'Workspace slug is ambiguous; use its ID')
      config.workspaceId = matches[0].id
      await saveConfig(config)
      console.log(JSON.stringify({ data: { selected: matches[0] } }, null, 2))
      return
    }
    throw new Error('Unknown workspaces command')
  }
  async function serviceCall(service, method, path, body, binary = false) {
    let token = key
    if (service !== 'core') {
      const session = await call(coreUrl, `/v1/products/${service}/key-session`, {
        method: 'POST', headers: coreHeaders(key),
      })
      token = session.data.token
    }
    const headers = service === 'core' ? coreHeaders(token) : { authorization: `Bearer ${token}` }
    if (body !== undefined) headers['content-type'] = 'application/json'
    return call(urlFor(config, service), path, {
      method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }, binary)
  }
  let result
  if (command === 'tools') {
    result = await serviceCall(action, 'GET', '/v1/tools')
  } else if (command === 'tool') {
    const [name, ...options] = rest
    if (!name) throw new Error('Missing tool name')
    result = await serviceCall(action, 'POST', `/v1/tools/${encodeURIComponent(name)}`, await payload(options) ?? {})
  } else if (command === 'api') {
    const [method, path, ...options] = rest
    if (!/^(GET|POST|PATCH|PUT|DELETE)$/i.test(method ?? '') || !path?.startsWith('/v1/')) {
      throw new Error('Usage: amentoi api <service> <METHOD> </v1/path>')
    }
    result = await serviceCall(action, method.toUpperCase(), path, await payload(options))
  } else if (command === 'link') {
    const [a, b, c, ...options] = rest
    if (action === 'pages') result = await serviceCall('link', 'GET', '/v1/link/pages')
    else if (action === 'create') result = await serviceCall('link', 'POST', '/v1/link/pages', { slug: a, title: b })
    else if (action === 'publish') result = await serviceCall('link', 'POST', `/v1/link/pages/${encodeURIComponent(a)}/publish`)
    else if (action === 'add') result = await serviceCall('link', 'POST', `/v1/link/pages/${encodeURIComponent(a)}/blocks`, { type: 'LINK', config: { url: b, label: c } })
    else if (action === 'stats') result = await serviceCall('link', 'GET', `/v1/link/pages/${encodeURIComponent(a)}/stats${valueOption(rest, '--days') ? `?days=${encodeURIComponent(valueOption(rest, '--days'))}` : ''}`)
    else if (action === 'window') {
      const until = options[0]
      result = await serviceCall('link', 'PATCH', `/v1/link/pages/${encodeURIComponent(a)}/blocks/${encodeURIComponent(b)}/visibility-window`, { visibleFrom: c === 'null' ? null : c, visibleUntil: until === 'null' ? null : until })
    } else if (action === 'image') {
      const output = valueOption(rest, '--output')
      if (!output) throw new Error('link image requires --output PATH')
      const image = await serviceCall('link', 'POST', `/v1/link/pages/${encodeURIComponent(a)}/thumbnails/preview`, { url: b, kind: valueOption(rest, '--kind') ?? 'auto' }, true)
      await writeFile(output, image.bytes)
      result = { data: { output, contentType: image.contentType, bytes: image.bytes.length } }
    } else if (action === 'thumbnail') {
      const file = valueOption(rest, '--file')
      if (!file) throw new Error('link thumbnail requires --file PATH')
      const tokenResponse = await call(coreUrl, '/v1/products/link/key-session', { method: 'POST', headers: coreHeaders(key) })
      const bytes = await readFile(file)
      const kind = bytes[0] === 0x89 && bytes[1] === 0x50 ? 'image/png' : bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : 'image/webp'
      result = await call(urlFor(config, 'link'), `/v1/link/pages/${encodeURIComponent(a)}/thumbnails`, {
        method: 'POST', headers: { authorization: `Bearer ${tokenResponse.data.token}`, 'content-type': kind }, body: bytes,
      })
      const page = await serviceCall('link', 'GET', `/v1/link/pages/${encodeURIComponent(a)}`)
      const block = page.data.blocks.find((item) => item.id === b)
      if (!block || (block.type !== 'LINK' && block.type !== 'FORM')) throw new Error('Block not found or does not accept thumbnails')
      await serviceCall('link', 'PATCH', `/v1/link/pages/${encodeURIComponent(a)}/blocks/${encodeURIComponent(b)}`, {
        config: { ...block.config, thumbnail: { kind: 'asset', assetId: result.data.assetId } },
      })
      result.data.blockId = b
    }
    else throw new Error('Unknown link command')
  } else if (command === 'forms') {
    const [a, b] = rest
    if (action === 'list') result = await serviceCall('forms', 'GET', '/v1/forms')
    else if (action === 'create') result = await serviceCall('forms', 'POST', '/v1/forms', { name: a, slug: b, schema: await payload(rest) })
    else if (action === 'publish') result = await serviceCall('forms', 'POST', `/v1/forms/${encodeURIComponent(a)}/versions`)
    else if (action === 'responses') {
      const query = new URLSearchParams()
      for (const option of ['--limit', '--cursor']) { const value = valueOption(rest, option); if (value) query.set(option.slice(2), value) }
      result = await serviceCall('forms', 'GET', `/v1/forms/${encodeURIComponent(a)}/submissions${query.size ? `?${query}` : ''}`)
    } else if (action === 'stats') result = await serviceCall('forms', 'GET', '/v1/dashboard')
    else throw new Error('Unknown forms command')
  } else if (command === 'people') {
    if (action === 'list') {
      const query = new URLSearchParams()
      for (const option of ['--query', '--limit']) { const value = valueOption(rest, option); if (value) query.set(option.slice(2), value) }
      result = await serviceCall('people', 'GET', `/v1/people${query.size ? `?${query}` : ''}`)
    } else if (action === 'get') result = await serviceCall('people', 'GET', `/v1/people/${encodeURIComponent(rest[0])}`)
    else if (action === 'overview') result = await serviceCall('people', 'GET', '/v1/people/overview')
    else if (action === 'stats') {
      const days = valueOption(rest, '--days')
      result = await serviceCall('people', 'GET', `/v1/people/stats/growth${days ? `?days=${encodeURIComponent(days)}` : ''}`)
    } else throw new Error('Unknown people command')
  } else throw new Error('Unknown command. Run amentoi --help')
  console.log(JSON.stringify(result, null, 2))
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`amentoi: ${error.message}`)
  process.exitCode = 1
})
