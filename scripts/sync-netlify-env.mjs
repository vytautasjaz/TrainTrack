#!/usr/bin/env node
/**
 * Build a gitignored env/netlify.env from Neon production + local OAuth keys,
 * then optionally import it into a linked Netlify site.
 *
 *   node scripts/sync-netlify-env.mjs
 *   node scripts/sync-netlify-env.mjs --site-url https://your-app.netlify.app
 *   node scripts/sync-netlify-env.mjs --import
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

const root = process.cwd()
const outPath = join(root, 'env', 'netlify.env')
const localEnvPath = join(root, '.env')
const args = new Set(process.argv.slice(2))
function normalizeSiteUrl(raw) {
  const trimmed = (raw || '').trim().replace(/\/$/, '')
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const siteUrlArg = process.argv.includes('--site-url')
  ? normalizeSiteUrl(process.argv[process.argv.indexOf('--site-url') + 1])
  : ''

function parseEnv(text) {
  const map = new Map()
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eq = trimmed.indexOf('=')
    const key = trimmed.slice(0, eq)
    let value = trimmed.slice(eq + 1)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    map.set(key, value)
  }
  return map
}

function neonCs(extraArgs) {
  return execFileSync(
    'npx',
    [
      '--yes',
      'neon',
      'connection-string',
      'production',
      '--project-id',
      'restless-surf-17286273',
      '--role-name',
      'neondb_owner',
      '--prisma',
      ...extraArgs,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim()
}

const pooled = neonCs(['--pooled'])
const direct = neonCs([])
if (!pooled.includes('neon.tech') || !direct.includes('neon.tech')) {
  console.error('Could not load Neon production connection strings')
  process.exit(1)
}

const local = existsSync(localEnvPath) ? parseEnv(readFileSync(localEnvPath, 'utf8')) : new Map()
const siteUrl = (siteUrlArg || '').replace(/\/$/, '')
const authSecret =
  local.get('AUTH_SECRET') && !local.get('AUTH_SECRET')?.includes('dev-only')
    ? local.get('AUTH_SECRET')
    : randomBytes(32).toString('base64')

const lines = [
  '# Generated for Netlify — gitignored. Do not commit.',
  '# Production Neon branch (not the temporary local-copy branch).',
  `DATABASE_URL="${pooled}"`,
  `DATABASE_URL_UNPOOLED="${direct}"`,
  '',
  'AUTH_TRUST_HOST="true"',
  `AUTH_SECRET="${authSecret}"`,
  siteUrl
    ? `NEXT_PUBLIC_APP_URL="${siteUrl}"`
    : 'NEXT_PUBLIC_APP_URL="https://YOUR-SITE.netlify.app"',
  siteUrl ? `AUTH_URL="${siteUrl}"` : 'AUTH_URL="https://YOUR-SITE.netlify.app"',
  '',
  `AUTH_GOOGLE_ID="${local.get('AUTH_GOOGLE_ID') ?? ''}"`,
  `AUTH_GOOGLE_SECRET="${local.get('AUTH_GOOGLE_SECRET') ?? ''}"`,
  `STRAVA_CLIENT_ID="${local.get('STRAVA_CLIENT_ID') ?? ''}"`,
  `STRAVA_CLIENT_SECRET="${local.get('STRAVA_CLIENT_SECRET') ?? ''}"`,
  `STRAVA_SCOPES="${local.get('STRAVA_SCOPES') ?? 'read,activity:read_all,profile:read_all'}"`,
  '',
]

writeFileSync(outPath, `${lines.join('\n')}\n`)
console.log('Wrote env/netlify.env (gitignored) with Neon production URLs')
if (!siteUrl) {
  console.log('Replace YOUR-SITE.netlify.app with the real Netlify URL, then re-run with --site-url')
}

if (args.has('--import')) {
  try {
    execFileSync('npx', ['--yes', 'netlify-cli', 'env:import', outPath], {
      stdio: 'inherit',
    })
  } catch {
    console.error('Netlify import failed. Run: npx netlify login')
    console.error('Then: npx netlify env:import env/netlify.env')
    process.exit(1)
  }
} else {
  console.log('After Netlify login + site link:')
  console.log('  npx netlify env:import env/netlify.env')
}
