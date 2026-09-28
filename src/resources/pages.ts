import { Command } from 'commander'
import { clientFor } from '../lib/client.js'
import { id, parseBody, run, type DataOptions } from '../lib/cli.js'

const link = clientFor('link')
export const pagesResource = new Command('pages').description('Manage Link profile pages')

pagesResource.command('list').description('List profile pages')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli pages list --json')
  .action((opts: DataOptions) => run(() => link.get('/v1/link/pages'), opts))

pagesResource.command('get').description('Get one profile page and its blocks')
  .argument('<page-id>').option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli pages get PAGE_ID --json')
  .action((pageId: string, opts: DataOptions) => run(() => link.get(`/v1/link/pages/${id(pageId)}`), opts))

pagesResource.command('create').description('Create a Link profile page')
  .requiredOption('--slug <slug>', 'Public page slug')
  .requiredOption('--title <title>', 'Page title')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli pages create --slug mon-profil --title "Mon profil" --json')
  .action((opts: DataOptions & { slug: string; title: string }) =>
    run(() => link.post('/v1/link/pages', { slug: opts.slug, title: opts.title }), opts))

pagesResource.command('update').description('Update title, bio, locale, or theme with a JSON body')
  .argument('<page-id>').option('--data <json>', 'JSON body').option('--file <path>', 'JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli pages update PAGE_ID --data \'{"bio":"Bonjour"}\' --json')
  .action((pageId: string, opts: DataOptions) =>
    run(() => link.patch(`/v1/link/pages/${id(pageId)}`, parseBody(opts)), opts))

pagesResource.command('publish').description('Publish the current page draft')
  .argument('<page-id>').option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli pages publish PAGE_ID --json')
  .action((pageId: string, opts: DataOptions) =>
    run(() => link.post(`/v1/link/pages/${id(pageId)}/publish`), opts))

pagesResource.command('stats').description('Read measured views and clicks')
  .argument('<page-id>').option('--days <n>', 'Number of days')
  .option('--json', 'Output as JSON')
  .addHelpText('after', '\nExample: amentoi-cli pages stats PAGE_ID --days 30 --json')
  .action((pageId: string, opts: DataOptions & { days?: string }) =>
    run(() => link.get(`/v1/link/pages/${id(pageId)}/stats`, { days: opts.days }), opts))
