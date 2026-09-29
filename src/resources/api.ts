import { Command } from 'commander'
import { request, requestBytes, uploadBytes } from '../lib/client.js'
import { run, parseBody, type DataOptions } from '../lib/cli.js'
import { isServiceName } from '../lib/config.js'

export const apiResource = new Command('api').description('Call any existing /v1 endpoint on a configured service')
apiResource.command('call').description('Make an API request; rights are checked by Core and the service')
  .argument('<service>', 'core or a configured product key')
  .argument('<method>', 'GET, POST, PATCH, PUT, or DELETE')
  .argument('<path>', '/v1/path')
  .option('--data <json>', 'JSON body').option('--file <path>', 'JSON body file')
  .option('--idempotency-key <key>', 'Idempotency key for retry-safe write endpoints')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli api call link GET /v1/link/pages --json')
  .action((name: string, rawMethod: string, path: string, opts: DataOptions & { idempotencyKey?: string }) =>
    run(() => {
      if (!isServiceName(name)) throw new Error(`Unsupported service: ${name}`)
      const method = rawMethod.toUpperCase()
      if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) throw new Error('Unsupported HTTP method')
      const body = opts.data || opts.file ? parseBody(opts) : undefined
      return request(name, method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path, body, undefined,
        opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : undefined)
    }, opts))

apiResource.command('download').description('Download a binary response from an existing /v1 endpoint')
  .argument('<service>').argument('<method>', 'GET or POST').argument('<path>', '/v1/path')
  .requiredOption('--output <path>', 'Local output file')
  .option('--data <json>', 'JSON body for POST').option('--file <path>', 'JSON body file for POST')
  .option('--json', 'Output as JSON')
  .action((name: string, rawMethod: string, path: string, opts: DataOptions & { output: string }) =>
    run(async () => {
      if (!isServiceName(name)) throw new Error(`Unsupported service: ${name}`)
      const method = rawMethod.toUpperCase()
      if (method !== 'GET' && method !== 'POST') throw new Error('Download method must be GET or POST')
      const body = opts.data || opts.file ? parseBody(opts) : undefined
      const result = await requestBytes(name, method, path, body)
      await Bun.write(opts.output, result.bytes)
      return { data: { output: opts.output, bytes: result.bytes.length, contentType: result.contentType }, meta: {} }
    }, opts))

apiResource.command('upload').description('Upload a file to an existing /v1 endpoint')
  .argument('<service>').argument('<method>', 'POST, PUT, or PATCH').argument('<path>', '/v1/path')
  .requiredOption('--file <path>', 'Local file to upload')
  .requiredOption('--content-type <type>', 'Media type expected by the endpoint')
  .option('--json', 'Output as JSON')
  .action((name: string, rawMethod: string, path: string, opts: DataOptions & { file: string; contentType: string }) =>
    run(async () => {
      if (!isServiceName(name)) throw new Error(`Unsupported service: ${name}`)
      const method = rawMethod.toUpperCase()
      if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') throw new Error('Upload method must be POST, PUT, or PATCH')
      const bytes = new Uint8Array(await Bun.file(opts.file).arrayBuffer())
      return uploadBytes(name, path, bytes, opts.contentType, method)
    }, opts))
