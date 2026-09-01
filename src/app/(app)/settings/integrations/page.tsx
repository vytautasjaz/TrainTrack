import { redirect } from 'next/navigation'

type PageProps = {
  searchParams: Promise<{ connected?: string; error?: string }>
}

/** Legacy route — Strava lives under unified Settings → Integrations. */
export default async function IntegrationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = new URLSearchParams()
  if (params.connected) query.set('connected', params.connected)
  if (params.error) query.set('error', params.error)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  redirect(`/settings${suffix}#integrations`)
}
