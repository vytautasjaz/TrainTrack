import { redirect } from 'next/navigation'

type PageProps = {
  searchParams: Promise<{ connected?: string; error?: string }>
}

/** Legacy route — unified settings live at /settings. */
export default async function PreferencesSettingsRedirect({ searchParams }: PageProps) {
  const params = await searchParams
  const query = new URLSearchParams()
  if (params.connected) query.set('connected', params.connected)
  if (params.error) query.set('error', params.error)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  redirect(`/settings${suffix}#integrations`)
}
