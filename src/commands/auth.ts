import { Command } from 'commander'
import { getToken, setToken, removeToken, hasToken, maskToken } from '../lib/auth.js'
import { clientFor } from '../lib/client.js'
import { globalFlags } from '../lib/config.js'
import { handleError } from '../lib/errors.js'
import { run } from '../lib/cli.js'

export const authCommand = new Command('auth').description('Manage the shared workspace API key')

authCommand.command('set')
  .description('Save a key from stdin; optional argument is less private because shells record it')
  .argument('[token]')
  .addHelpText('after', '\nExample: printf %s "$AMENTOI_API_KEY" | amentoi-cli auth set')
  .action(async (argument?: string) => {
    try {
      let token = argument
      if (!token) {
        if (process.stdin.isTTY) throw new Error('Pipe the key through stdin')
        token = (await Bun.stdin.text()).trim()
      }
      setToken(token)
      if (globalFlags.json) console.log(JSON.stringify({ ok: true, data: { saved: true }, meta: {} }))
      else console.log('API key saved')
    } catch (error) { handleError(error, globalFlags.json) }
  })

authCommand.command('show')
  .description('Show the current key masked by default')
  .option('--raw', 'Show the complete secret')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli auth show')
  .action((opts: { raw?: boolean; json?: boolean }) => {
    try {
      const token = getToken()
      const shown = opts.raw ? token : maskToken(token)
      if (opts.json || globalFlags.json) console.log(JSON.stringify({ ok: true, data: { token: shown }, meta: {} }))
      else console.log(shown)
    } catch (error) { handleError(error, opts.json || globalFlags.json) }
  })

authCommand.command('remove')
  .description('Remove the saved key; environment variables and legacy config are unaffected')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli auth remove')
  .action((opts: { json?: boolean }) => {
    removeToken()
    if (opts.json || globalFlags.json) console.log(JSON.stringify({ ok: true, data: { removed: true }, meta: {} }))
    else console.log('Saved API key removed')
  })

authCommand.command('test')
  .description('Verify the key with Core')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli auth test --json')
  .action((opts: { json?: boolean }) => run(async () => {
    if (!hasToken()) throw new Error('No API key configured')
    await clientFor('core').get('/v1/tools')
    return { data: { valid: true }, meta: {} }
  }, opts))
