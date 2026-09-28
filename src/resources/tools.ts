import { Command } from 'commander'
import { clientFor } from '../lib/client.js'
import { id, run, parseBody, type DataOptions } from '../lib/cli.js'
import { SERVICE_NAMES, type Service } from '../lib/config.js'

function service(name: string): Service {
  if (!SERVICE_NAMES.includes(name as Service)) throw new Error(`Unsupported service: ${name}`)
  return name as Service
}
export const toolsResource = new Command('tools').description('Discover and call service tools')

toolsResource.command('list').description('List permitted tools exposed by a service')
  .argument('<service>').option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli tools list people --json')
  .action((name: string, opts: DataOptions) => run(() => clientFor(service(name)).get('/v1/tools'), opts))

toolsResource.command('call').description('Call one permitted service tool')
  .argument('<service>').argument('<tool-name>')
  .option('--data <json>', 'Tool payload').option('--file <path>', 'Tool payload file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli tools call people list_people --data \'{}\' --json')
  .action((name: string, toolName: string, opts: DataOptions) =>
    run(() => clientFor(service(name)).post(`/v1/tools/${id(toolName)}`, opts.data || opts.file ? parseBody(opts) : {}), opts))
