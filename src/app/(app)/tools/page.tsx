import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAthletePreferences } from '@/app/actions/preferences'
import { CalculatorsView } from '@/components/calculators/calculators-view'
import { buildCalculatorDefaults } from '@/lib/calculators/prefill'
import { getSession, resolveAthleteId } from '@/lib/session'

export default async function ToolsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  const preferences = athleteId ? await getAthletePreferences(athleteId) : null
  const defaults = buildCalculatorDefaults(preferences)

  return (
    <div className="max-w-3xl space-y-6">
      <Suspense fallback={null}>
        <CalculatorsView defaults={defaults} />
      </Suspense>
    </div>
  )
}
