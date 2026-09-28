import { Command } from 'commander'
import { SERVICE_NAMES, serviceUrl, setServiceUrl, type Service } from '../lib/config.js'
import { handleError } from '../lib/errors.js'
import { run } from '../lib/cli.js'

export const configCommand = new Command('config').description('Configure service API origins')

configCommand.command('set')
  .description('Set the HTTPS origin of one service')
  .argument('<service>', 'core, link, forms, or people')
  .argument('<url>', 'API origin')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli config set core https://api.dev.amentoi.com')
  .action((service: string, url: string, opts: { json?: boolean }) => {
    try {
      if (!SERVICE_NAMES.includes(service as Service)) throw new Error('Unknown service')
      setServiceUrl(service as Service, url)
      if (opts.json) console.log(JSON.stringify({ ok: true, data: { service, url: serviceUrl(service as Service) }, meta: {} }))
      else console.log(`Configured ${service}`)
    } catch (error) { handleError(error, opts.json) }
  })

configCommand.command('list')
  .description('List configured service origins')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli config list --json')
  .action((opts: { json?: boolean }) => run(async () => ({
    data: Object.fromEntries(SERVICE_NAMES.flatMap((service) => {
      try { return [[service, serviceUrl(service)]] } catch { return [] }
    })), meta: {},
  }), opts))
