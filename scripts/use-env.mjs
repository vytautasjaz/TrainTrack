#!/usr/bin/env node
import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const mode = process.argv[2]
const root = process.cwd()
const envPath = join(root, '.env')

if (!mode || !['local', 'supabase'].includes(mode)) {
  console.error('Usage: node scripts/use-env.mjs <local|supabase>')
  process.exit(1)
}

if (mode === 'local') {
  const source = join(root, 'env', 'local.env')
  copyFileSync(source, envPath)
  console.log('Using local database: postgresql://traintrack:***@localhost:5433/traintrack')
  console.log('Start Postgres with: npm run db:up')
  process.exit(0)
}

const supabaseEnv = join(root, '.env.supabase')
if (!existsSync(supabaseEnv)) {
  console.error('Missing .env.supabase')
  console.error('Copy env/supabase.env.example to .env.supabase and add your Supabase password.')
  process.exit(1)
}

copyFileSync(supabaseEnv, envPath)
console.log('Using Supabase database from .env.supabase')
