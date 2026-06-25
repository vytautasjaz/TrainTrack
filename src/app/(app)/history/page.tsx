import { redirect } from 'next/navigation'

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function HistoryRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value != null) query.set(key, value)
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  redirect(`/training${suffix}`)
}
