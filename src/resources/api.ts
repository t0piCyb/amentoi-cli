import { Command } from 'commander'
import { request } from '../lib/client.js'
import { run, parseBody, type DataOptions } from '../lib/cli.js'
import { SERVICE_NAMES, type Service } from '../lib/config.js'

export const apiResource = new Command('api').description('Call any existing /v1 endpoint on a configured service')
apiResource.command('call').description('Make an API request; rights are checked by Core and the service')
  .argument('<service>', 'core, link, forms, or people')
  .argument('<method>', 'GET, POST, PATCH, PUT, or DELETE')
  .argument('<path>', '/v1/path')
  .option('--data <json>', 'JSON body').option('--file <path>', 'JSON body file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli api call link GET /v1/link/pages --json')
  .action((name: string, rawMethod: string, path: string, opts: DataOptions) =>
    run(() => {
      if (!SERVICE_NAMES.includes(name as Service)) throw new Error(`Unsupported service: ${name}`)
      const method = rawMethod.toUpperCase()
      if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) throw new Error('Unsupported HTTP method')
      const body = opts.data || opts.file ? parseBody(opts) : undefined
      return request(name as Service, method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path, body)
    }, opts))
