import { redirect } from 'next/navigation'

export default async function SwimWorkoutsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim()
  redirect(q ? `/workouts/library/swim?q=${encodeURIComponent(q)}` : '/workouts/library/swim')
}
