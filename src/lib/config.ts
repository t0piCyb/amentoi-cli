import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs'

export const APP_CLI = 'amentoi-cli'
export const TOKEN_PATH = join(homedir(), '.config', 'tokens', 'amentoi-cli.txt')
export const LEGACY_CONFIG_PATH = process.env.AMENTOI_CONFIG ?? join(homedir(), '.config', 'amentoi', 'cli.json')
export const SERVICE_NAMES = ['core', 'link', 'forms', 'people'] as const
export type Service = (typeof SERVICE_NAMES)[number]

export const globalFlags = {
  json: false,
  format: 'text' as 'text' | 'json' | 'csv' | 'yaml',
  verbose: false,
  noColor: false,
  noHeader: false,
}

export interface LegacyConfig { apiKey?: string; urls?: Record<string, string> }
export function legacyConfig(): LegacyConfig {
  try { return JSON.parse(readFileSync(LEGACY_CONFIG_PATH, 'utf8')) as LegacyConfig }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error }
}

export function serviceUrl(service: Service): string {
  const raw = process.env[`AMENTOI_${service.toUpperCase()}_URL`] ?? legacyConfig().urls?.[service]
  if (!raw) throw new Error(`Configure ${service}: amentoi-cli config set ${service} https://...`)
  const url = new URL(raw)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('Service URL must use HTTPS')
  }
  return url.origin
}

export function setServiceUrl(service: Service, raw: string): void {
  const url = new URL(raw)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('Service URL must use HTTPS')
  }
  const config = legacyConfig()
  config.urls = { ...config.urls, [service]: url.origin }
  mkdirSync(dirname(LEGACY_CONFIG_PATH), { recursive: true, mode: 0o700 })
  writeFileSync(LEGACY_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 })
  chmodSync(LEGACY_CONFIG_PATH, 0o600)
}
