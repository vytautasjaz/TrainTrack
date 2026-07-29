import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAthletePreferences } from '@/app/actions/preferences'
import { CalculatorsView } from '@/components/calculators/calculators-view'
import { PageHeader } from '@/components/ui/page-header'
import { buildCalculatorDefaults, getZone3RunPaceMinPerKm } from '@/lib/calculators/prefill'
import { formatPaceMinPerKm } from '@/lib/athlete-preferences'
import { getSession, resolveAthleteId } from '@/lib/session'

export default async function CalculatorsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  const preferences = athleteId ? await getAthletePreferences(athleteId) : null
  const defaults = buildCalculatorDefaults(preferences)
  const z3 = getZone3RunPaceMinPerKm(preferences)
  const zone3PaceLabel = z3 != null ? formatPaceMinPerKm(z3) : null

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Calculators"
        description="Plan race times from pace, or work out pace from a finish time"
      />
      <Suspense fallback={null}>
        <CalculatorsView defaults={defaults} zone3PaceLabel={zone3PaceLabel} />
      </Suspense>
    </div>
  )
}
