import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { StravaConnectCard } from '@/components/integrations/strava-connect-card'
import { HrZonesForm } from '@/components/settings/hr-zones-form'
import { PaceZonesForm } from '@/components/settings/pace-zones-form'
import { AthleteNameForm } from '@/components/settings/athlete-name-form'
import { getAthletePreferences } from '@/app/actions/preferences'
import { getSession, resolveAthleteId } from '@/lib/session'
import { isStravaConfigured } from '@/lib/strava/config'
import { getStravaConnectionSummary } from '@/lib/strava/sync'
import { formatPaceMinPerKm, estimateDurationMin } from '@/lib/athlete-preferences'

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Strava authorization was cancelled.',
  invalid_state: 'Strava login expired. Please try connecting again.',
  token_exchange: 'Could not complete Strava login. Check your API credentials.',
  not_configured: 'Strava API credentials are not configured on the server.',
}

type PageProps = {
  searchParams: Promise<{ connected?: string; error?: string }>
}

export default async function PreferencesPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Preferences"
          description="Select an athlete to manage training preferences."
        />
        <p className="text-sm text-muted-foreground">No athlete profile available.</p>
      </div>
    )
  }

  const preferences = (await getAthletePreferences(athleteId)) ?? {}
  const isAthlete = session.role === 'ATHLETE' && session.athleteId

  const params = isAthlete ? await searchParams : {}
  const stravaSummary = isAthlete
    ? await getStravaConnectionSummary(session.userId, session.athleteId!)
    : null
  const connected = Boolean(stravaSummary)
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? 'Something went wrong.' : null
  const successMessage = params.connected === '1' ? 'Strava connected successfully.' : null

  const easyPace = preferences.paceEasyMinPerKm
  const durationPreview =
    easyPace != null ? estimateDurationMin(10, easyPace) : null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Preferences"
        description={
          isAthlete
            ? 'Profile, training zones, heart rate limits, and connected services.'
            : 'Training zones, heart rate limits, and connected services.'
        }
      />

      {isAthlete && (
        <section className="card-elevated space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold">Profile</h2>
            <p className="text-xs text-muted-foreground">How your name appears in the app</p>
          </div>
          <AthleteNameForm name={session.name} />
        </section>
      )}

      <section className="card-elevated space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold">Training paces</h2>
          <p className="text-xs text-muted-foreground">Per-km targets for each intensity level</p>
        </div>
        <PaceZonesForm preferences={preferences} />
        {durationPreview != null && easyPace != null && (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Example: a 10 km easy run at {formatPaceMinPerKm(easyPace)}/km ≈ {durationPreview} min
          </p>
        )}
      </section>

      <section className="card-elevated space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold">Heart rate zones</h2>
          <p className="text-xs text-muted-foreground">Bpm limits for recovery through VO2 max</p>
        </div>
        <HrZonesForm preferences={preferences} />
      </section>

      {isAthlete && (
        <section id="integrations" className="card-elevated space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold">Integrations</h2>
            <p className="text-xs text-muted-foreground">Connect external services to sync training data</p>
          </div>
          <StravaConnectCard
            connected={connected}
            configured={isStravaConfigured()}
            summary={stravaSummary}
            errorMessage={errorMessage}
            successMessage={successMessage}
          />
        </section>
      )}
    </div>
  )
}
