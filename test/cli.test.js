import { strict as assert } from 'node:assert'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { join } from 'node:path'
import { test } from 'node:test'

const cli = join(import.meta.dirname, '..', 'bin', 'amentoi.js')
const key = `amen_sk_test_${'a'.repeat(12)}_${'b'.repeat(32)}`

async function server(handler) {
  const instance = createServer(handler)
  instance.listen(0, '127.0.0.1')
  await once(instance, 'listening')
  return { instance, url: `http://127.0.0.1:${instance.address().port}` }
}

async function run(args, env) {
  const child = spawn(process.execPath, [cli, ...args], { env: { ...process.env, ...env } })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  const [code] = await once(child, 'close')
  return { code, stdout, stderr }
}

test('exchanges the shared key and sends only the short token to Link', async () => {
  const requests = []
  const core = await server((request, response) => {
    requests.push({ service: 'core', path: request.url, key: request.headers['x-api-key'] })
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ data: { token: 'short-product-token' } }))
  })
  const link = await server((request, response) => {
    requests.push({ service: 'link', path: request.url, authorization: request.headers.authorization, key: request.headers['x-api-key'] })
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ data: [{ id: 'page-1' }] }))
  })
  try {
    const result = await run(['link', 'pages'], {
      AMENTOI_API_KEY: key, AMENTOI_CORE_URL: core.url, AMENTOI_LINK_URL: link.url,
    })
    assert.equal(result.code, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout).data, [{ id: 'page-1' }])
    assert.deepEqual(requests, [
      { service: 'core', path: '/v1/products/link/key-session', key },
      { service: 'link', path: '/v1/link/pages', authorization: 'Bearer short-product-token', key: undefined },
    ])
  } finally {
    core.instance.close()
    link.instance.close()
  }
})

test('legacy amentoi command selects workspace without sending key to People', async () => {
  const requests = []
  const core = await server((request, response) => {
    requests.push({ service: 'core', path: request.url, key: request.headers['x-api-key'], workspace: request.headers['x-amen-workspace-id'] })
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ data: { token: 'people-session' } }))
  })
  const people = await server((request, response) => {
    requests.push({ service: 'people', path: request.url, bearer: request.headers.authorization, key: request.headers['x-api-key'] })
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ data: { counts: {} } }))
  })
  try {
    const result = await run(['--workspace', 'org-id', 'people', 'overview'], {
      AMENTOI_API_KEY: key, AMENTOI_CORE_URL: core.url, AMENTOI_PEOPLE_URL: people.url,
    })
    assert.equal(result.code, 0, result.stderr)
    assert.deepEqual(requests, [
      { service: 'core', path: '/v1/products/people/key-session', key, workspace: 'org-id' },
      { service: 'people', path: '/v1/people/overview', bearer: 'Bearer people-session', key: undefined },
    ])
  } finally {
    core.instance.close()
    people.instance.close()
  }
})
