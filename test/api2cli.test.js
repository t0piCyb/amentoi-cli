import { strict as assert } from 'node:assert'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { join } from 'node:path'
import { test } from 'node:test'

const cli = join(import.meta.dirname, '..', 'dist', 'index.js')
const key = `amen_sk_test_${'a'.repeat(12)}_${'b'.repeat(32)}`

async function server(handler) {
  const instance = createServer(handler)
  instance.listen(0, '127.0.0.1')
  await once(instance, 'listening')
  return { instance, url: `http://127.0.0.1:${instance.address().port}` }
}

async function run(args, env) {
  const child = spawn('bun', [cli, ...args], { env: { ...process.env, ...env } })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  const [code] = await once(child, 'close')
  return { code, stdout, stderr }
}

test('api2cli command exchanges shared key and returns a single JSON envelope', async () => {
  const requests = []
  const core = await server((request, response) => {
    requests.push({ service: 'core', path: request.url, key: request.headers['x-api-key'] })
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ data: { token: 'short-link-token' }, meta: {} }))
  })
  const link = await server((request, response) => {
    requests.push({ service: 'link', path: request.url, bearer: request.headers.authorization, key: request.headers['x-api-key'] })
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ data: [{ id: 'page-1' }], meta: { measured: true } }))
  })
  try {
    const result = await run(['pages', 'list', '--json'], {
      AMENTOI_API_KEY: key, AMENTOI_CORE_URL: core.url, AMENTOI_LINK_URL: link.url,
    })
    assert.equal(result.code, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), { ok: true, data: [{ id: 'page-1' }], meta: { measured: true } })
    assert.deepEqual(requests, [
      { service: 'core', path: '/v1/products/link/key-session', key },
      { service: 'link', path: '/v1/link/pages', bearer: 'Bearer short-link-token', key: undefined },
    ])
  } finally {
    core.instance.close()
    link.instance.close()
  }
})

test('API denial produces JSON error and nonzero exit', async () => {
  const core = await server((_request, response) => {
    response.writeHead(403, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: { code: 'SCOPE_DENIED', message: 'scope denied' } }))
  })
  try {
    const result = await run(['pages', 'list', '--json'], { AMENTOI_API_KEY: key, AMENTOI_CORE_URL: core.url })
    assert.equal(result.code, 1)
    assert.equal(JSON.parse(result.stderr).error.code, 403)
    assert.doesNotMatch(result.stderr, /amen_sk_test/)
  } finally {
    core.instance.close()
  }
})
