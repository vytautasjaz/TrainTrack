import { redirect } from 'next/navigation'

/** Legacy URL — Tools moved to `/tools`. */
export default async function CalculatorsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v)
    }
  }
  const query = qs.toString()
  redirect(query ? `/tools?${query}` : '/tools')
}
