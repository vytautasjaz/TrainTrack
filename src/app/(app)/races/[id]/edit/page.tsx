import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Legacy URL — race edit lives under /season. */
export default async function RaceEditRedirectPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v)
    }
  }
  const query = qs.toString()
  redirect(query ? `/season/${id}/edit?${query}` : `/season/${id}/edit`)
}
