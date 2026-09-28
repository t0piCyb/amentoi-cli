import { Command } from 'commander'
import { clientFor } from '../lib/client.js'
import { id, parseBody, run, type DataOptions } from '../lib/cli.js'

const forms = clientFor('forms')
export const formsResource = new Command('forms').description('Manage Forms')

formsResource.command('list').description('List forms in the workspace')
  .option('--limit <n>').option('--cursor <cursor>').option('--search <text>')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli forms list --limit 25 --json')
  .action((opts: DataOptions & { limit?: string; cursor?: string; search?: string }) =>
    run(() => forms.get('/v1/forms', { limit: opts.limit, cursor: opts.cursor, search: opts.search }), opts))

formsResource.command('get').description('Get one form')
  .argument('<form-id>').option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli forms get FORM_ID --json')
  .action((formId: string, opts: DataOptions) => run(() => forms.get(`/v1/forms/${id(formId)}`), opts))

formsResource.command('create').description('Create a form from a JSON body including name, slug, and schema')
  .option('--data <json>', 'Form JSON body').option('--file <path>', 'Form JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli forms create --file form.json --json')
  .action((opts: DataOptions) => run(() => forms.post('/v1/forms', parseBody(opts)), opts))

formsResource.command('update').description('Update a form draft from a JSON body')
  .argument('<form-id>').option('--data <json>', 'Form JSON body').option('--file <path>', 'Form JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli forms update FORM_ID --file changes.json --json')
  .action((formId: string, opts: DataOptions) =>
    run(() => forms.patch(`/v1/forms/${id(formId)}`, parseBody(opts)), opts))

formsResource.command('publish').description('Publish the current form draft')
  .argument('<form-id>').option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli forms publish FORM_ID --json')
  .action((formId: string, opts: DataOptions) =>
    run(() => forms.post(`/v1/forms/${id(formId)}/versions`), opts))

formsResource.command('stats').description('Read the Forms dashboard')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli forms stats --json')
  .action((opts: DataOptions) => run(() => forms.get('/v1/dashboard'), opts))
