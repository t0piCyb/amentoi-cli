import { readFileSync } from 'node:fs'
import { globalFlags } from './config.js'
import { output } from './output.js'
import { handleError } from './errors.js'

export interface DataOptions { json?: boolean; format?: string; data?: string; file?: string }

export function parseBody(opts: DataOptions): Record<string, unknown> {
  if (opts.data && opts.file) throw new Error('Choose --data or --file')
  const raw = opts.file ? readFileSync(opts.file, 'utf8') : opts.data
  if (!raw) throw new Error('Supply --data JSON or --file PATH')
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('JSON body must be an object')
  return parsed as Record<string, unknown>
}

export function run(task: () => Promise<unknown>, opts: DataOptions = {}): void {
  void Promise.resolve().then(task).then((result) => {
    const envelope = result as { data?: unknown; meta?: Record<string, unknown> } | null
    const data = envelope && typeof envelope === 'object' && 'data' in envelope ? envelope.data : result
    if (opts.json || globalFlags.json || opts.format === 'json' || globalFlags.format === 'json') {
      console.log(JSON.stringify({ ok: true, data, meta: envelope?.meta ?? {} }, null, 2))
    } else {
      output(data, { format: opts.format })
    }
  }).catch((error: unknown) => handleError(error, opts.json || globalFlags.json))
}

export function id(value: string): string { return encodeURIComponent(value) }
