import { Command } from 'commander'
import { clientFor } from '../lib/client.js'
import { selectedWorkspace, setWorkspaceId } from '../lib/config.js'
import { run, type DataOptions } from '../lib/cli.js'

interface Workspace { id: string; slug: string; name: string; type?: string }
async function available(): Promise<Workspace[]> {
  const result = await clientFor('core').get('/v1/key-workspaces') as { data?: Workspace[] }
  if (!Array.isArray(result.data)) throw new Error('Core returned no workspace list')
  return result.data
}

export const workspacesResource = new Command('workspaces').description('Choose a workspace for the shared account API key')

workspacesResource.command('list').description('List workspaces available to this key')
  .option('--json', 'Output as JSON')
  .action((opts: DataOptions) => run(() => clientFor('core').get('/v1/key-workspaces'), opts))

workspacesResource.command('use').description('Select a workspace by ID or unique slug')
  .argument('<id-or-slug>').option('--json', 'Output as JSON')
  .action((value: string, opts: DataOptions) => run(async () => {
    const matches = (await available()).filter((workspace) => workspace.id === value || workspace.slug === value)
    if (matches.length !== 1) throw new Error(matches.length === 0 ? 'Workspace is not available to this key' : 'Workspace slug is ambiguous; use its ID')
    setWorkspaceId(matches[0]!.id)
    return { data: { selected: matches[0] }, meta: {} }
  }, opts))

workspacesResource.command('current').description('Show the selected workspace ID')
  .option('--json', 'Output as JSON')
  .action((opts: DataOptions) => run(async () => ({ data: { workspaceId: selectedWorkspace() ?? null }, meta: {} }), opts))
