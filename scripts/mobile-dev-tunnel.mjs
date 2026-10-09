#!/usr/bin/env node
/**
 * Expose local Next.js (:3000) via Cloudflare quick tunnel so Google OAuth
 * can use a public HTTPS redirect URI (LAN IPs are rejected by Google).
 *
 * Usage (Next already running on :3000):
 *   npm run mobile:tunnel
 *
 * Then:
 * 1. Add the printed redirect URI to Google Web client (AUTH_GOOGLE_ID)
 * 2. Restart Expo (`cd mobile && npm start -- --clear`)
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mobileEnvPath = path.join(root, 'mobile', '.env')
const rootEnvPath = path.join(root, '.env')

function upsertEnv(filePath, key, value) {
  const line = `${key}=${value}`
  let text = ''
  if (fs.existsSync(filePath)) text = fs.readFileSync(filePath, 'utf8')
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(text)) text = text.replace(re, line)
  else text = `${text.trimEnd()}\n${line}\n`
  fs.writeFileSync(filePath, text, 'utf8')
}

function applyTunnelUrl(tunnelUrl) {
  const origin = tunnelUrl.replace(/\/$/, '')
  upsertEnv(mobileEnvPath, 'EXPO_PUBLIC_API_URL', origin)
  upsertEnv(mobileEnvPath, 'EXPO_PUBLIC_GOOGLE_OAUTH_URL', origin)
  upsertEnv(rootEnvPath, 'MOBILE_GOOGLE_OAUTH_ORIGIN', origin)

  const redirectUri = `${origin}/api/mobile/auth/google/callback`
  console.log('\n────────────────────────────────────────────')
  console.log('Tunnel ready:', origin)
  console.log('Updated mobile/.env + .env MOBILE_GOOGLE_OAUTH_ORIGIN')
  console.log('\nAdd THIS redirect URI on your website Google Web client:')
  console.log(' ', redirectUri)
  console.log('\nThen restart Next.js and Expo (npm start -- --clear).')
  console.log('────────────────────────────────────────────\n')
}

const child = spawn(
  'npx',
  ['--yes', 'cloudflared', 'tunnel', '--url', 'http://localhost:3000'],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
)

let applied = false
function maybeCapture(chunk) {
  const text = chunk.toString()
  process.stderr.write(chunk)
  if (applied) return
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
  if (!match) return
  applied = true
  applyTunnelUrl(match[0])
}

child.stdout.on('data', maybeCapture)
child.stderr.on('data', maybeCapture)

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
