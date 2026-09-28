import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, chmodSync } from 'node:fs'
import { dirname } from 'node:path'
import { TOKEN_PATH, legacyConfig } from './config.js'

export function getToken(): string {
  const token = process.env.AMENTOI_API_KEY ?? (existsSync(TOKEN_PATH) ? readFileSync(TOKEN_PATH, 'utf8').trim() : legacyConfig().apiKey)
  if (!token) throw new Error('No API key. Pipe it to: amentoi-cli auth set')
  return token
}

export function hasToken(): boolean {
  return Boolean(process.env.AMENTOI_API_KEY || existsSync(TOKEN_PATH) || legacyConfig().apiKey)
}

export function setToken(token: string): void {
  if (!/^amen_sk_(live|test)_[a-z2-7]{12}_[a-z2-7]{32}$/.test(token)) throw new Error('Invalid Amen API key')
  mkdirSync(dirname(TOKEN_PATH), { recursive: true, mode: 0o700 })
  writeFileSync(TOKEN_PATH, token + '\n', { mode: 0o600 })
  chmodSync(TOKEN_PATH, 0o600)
}

export function removeToken(): void { if (existsSync(TOKEN_PATH)) unlinkSync(TOKEN_PATH) }
export function maskToken(token: string): string { return `${token.slice(0, 16)}…${token.slice(-4)}` }
