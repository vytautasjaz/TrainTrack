/**
 * Ping the Next.js SSR function every few minutes so cold starts are rarer.
 * No secrets required — hits a DB-free health route.
 */
export default async () => {
  const base =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ''
  if (!base) {
    return new Response('skipped', { status: 200 })
  }

  const url = `${base.replace(/\/$/, '')}/api/health`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    return new Response(`warm:${res.status}`, { status: 200 })
  } catch (err) {
    console.error('[keep-warm] failed', err)
    return new Response('warm-failed', { status: 200 })
  }
}

export const config = {
  schedule: '*/5 * * * *',
}
