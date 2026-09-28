import { Command } from 'commander'
import { clientFor } from '../lib/client.js'
import { id, run, type DataOptions } from '../lib/cli.js'

const forms = clientFor('forms')
export const submissionsResource = new Command('submissions').description('Read form responses')

submissionsResource.command('list').description('List responses for one form')
  .argument('<form-id>').option('--limit <n>').option('--cursor <cursor>')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli submissions list FORM_ID --limit 50 --json')
  .action((formId: string, opts: DataOptions & { limit?: string; cursor?: string }) =>
    run(() => forms.get(`/v1/forms/${id(formId)}/submissions`, { limit: opts.limit, cursor: opts.cursor }), opts))

submissionsResource.command('get').description('Get one response')
  .argument('<submission-id>').option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli submissions get SUBMISSION_ID --json')
  .action((submissionId: string, opts: DataOptions) =>
    run(() => forms.get(`/v1/submissions/${id(submissionId)}`), opts))
