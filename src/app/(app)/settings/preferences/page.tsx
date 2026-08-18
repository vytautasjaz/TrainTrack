import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { StravaConnectCard } from '@/components/integrations/strava-connect-card'
import { CalendarSyncCard } from '@/components/integrations/calendar-sync-card'
import { CoachPlanningLeadForm } from '@/components/settings/coach-planning-lead-form'
import { CoachWorkoutBuilderPrefsForm } from '@/components/settings/coach-workout-builder-prefs-form'
import { CoachWorkoutTypePrefsForm } from '@/components/settings/coach-workout-type-prefs-form'
import { SignInMethodsSection } from '@/components/settings/sign-in-methods-section'
import { TrainingZonesTabs } from '@/components/settings/training-zones-tabs'
import { getAthletePreferences } from '@/app/actions/preferences'
import { getCalendarFeedSummaries } from '@/app/actions/preferences'
import { WeatherLocationForm } from '@/components/settings/weather-location-form'
import { getSession, resolveAthleteId, isCoach } from '@/lib/session'
import { isStravaConfigured } from '@/lib/strava/config'
import { getStravaConnectionSummary } from '@/lib/strava/sync'
import {
  clampPlanningLeadDays,
  DEFAULT_PLANNING_LEAD_DAYS,
} from '@/lib/queries'
import { parseWorkoutBuilderPrefs } from '@/lib/workout-builder/workout-builder-prefs'
import { parseWorkoutTypePrefs } from '@/lib/workout-builder/workout-type-prefs'
import { prisma } from '@/lib/prisma'

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

  const isAthlete = session.hasAthlete && Boolean(session.athleteId)
  const athleteId = await resolveAthleteId(session)

  const authUser = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: {
      passwordHash: true,
      accounts: { select: { provider: true } },
      planningLeadDays: true,
      workoutBuilderPrefs: true,
      coachProfile: { select: { id: true } },
    },
  })

  // Source of truth: if a coach profile exists in DB, show coach settings.
  const coach =
    Boolean(authUser.coachProfile?.id) || session.hasCoach || isCoach(session)
  const editingSelectedAthlete =
    coach && Boolean(athleteId) && athleteId !== session.athleteId

  const planningLeadDays = clampPlanningLeadDays(
    authUser.planningLeadDays ?? DEFAULT_PLANNING_LEAD_DAYS,
  )
  const workoutBuilderPrefs = parseWorkoutBuilderPrefs(authUser.workoutBuilderPrefs)
  const workoutTypePrefs = parseWorkoutTypePrefs(authUser.workoutBuilderPrefs)

  const providers = new Set(authUser.accounts.map((a) => a.provider))
  const hasGoogle = providers.has('google')
  const hasStrava = providers.has('strava')
  const hasPassword = Boolean(authUser.passwordHash)

  const params = isAthlete ? await searchParams : {}
  const stravaSummary = isAthlete
    ? await getStravaConnectionSummary(session.userId, session.athleteId!)
    : null
  const calendarFeeds = isAthlete ? await getCalendarFeedSummaries() : []
  const googleAccount = isAthlete
    ? await prisma.account.findFirst({
        where: { userId: session.userId, provider: 'google' },
        select: { id: true },
      })
    : null
  const connected = Boolean(stravaSummary)
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? 'Something went wrong.' : null
  const successMessage = params.connected === '1' ? 'Strava connected successfully.' : null

  const selectedPreferences =
    editingSelectedAthlete && athleteId
      ? ((await getAthletePreferences(athleteId)) ?? {})
      : null
  const weatherLocation = athleteId
    ? await prisma.athlete.findUnique({
        where: { id: athleteId },
        select: {
          weatherLocationName: true,
          weatherLat: true,
          weatherLon: true,
        },
      })
    : null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Preferences"
        description="Application, workout, athlete, and connection settings."
      />

      <section className="card-elevated space-y-4 p-5">
        <div>
          <SectionTitle variant="ui">Application preferences</SectionTitle>
          <Caption>Global behavior and reminder settings for your account.</Caption>
        </div>
        {coach ? <CoachPlanningLeadForm planningLeadDays={planningLeadDays} /> : <Caption>Additional application preferences will appear here as they are added.</Caption>}
      </section>

      {coach ? (
        <>
          <section className="card-elevated space-y-4 p-5">
            <div>
              <SectionTitle variant="ui">Workout preferences</SectionTitle>
              <Caption>
                Customize workout types and builder defaults used when creating training sessions.
              </Caption>
            </div>
            <div className="space-y-4">
              <section className="space-y-3 rounded-[8px] border border-border/60 p-4">
                <SectionTitle variant="ui">Workout types</SectionTitle>
                <Caption>
                  Control sport-specific workout type names and ordering shown in editors.
                </Caption>
                <CoachWorkoutTypePrefsForm initialPrefs={workoutTypePrefs} />
              </section>
              <section className="space-y-3 rounded-[8px] border border-border/60 p-4">
                <SectionTitle variant="ui">Workout builder</SectionTitle>
                <Caption>
                  Configure Add Block presets per sport (order, labels, and defaults).
                </Caption>
                <CoachWorkoutBuilderPrefsForm initialPrefs={workoutBuilderPrefs} />
              </section>
            </div>
          </section>
        </>
      ) : null}

      {(isAthlete || selectedPreferences || athleteId) ? (
        <section className="space-y-4">
          <div>
            <SectionTitle variant="ui">Athlete settings</SectionTitle>
            <Caption>Training zones and default weather location used in planning.</Caption>
          </div>
          {selectedPreferences ? (
            <section className="space-y-3">
              {editingSelectedAthlete ? (
                <Caption>
                  Editing training zones for the selected athlete. Athletes manage their own zones on
                  this page.
                </Caption>
              ) : null}
              <TrainingZonesTabs preferences={selectedPreferences} />
            </section>
          ) : null}
          {athleteId ? (
            <WeatherLocationForm
              initial={{
                name: weatherLocation?.weatherLocationName ?? null,
                lat: weatherLocation?.weatherLat ?? null,
                lon: weatherLocation?.weatherLon ?? null,
              }}
            />
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <SectionTitle variant="ui">Connections & sign-in</SectionTitle>
          <Caption>Authentication methods and external service integrations.</Caption>
        </div>

        <SignInMethodsSection
          hasGoogle={hasGoogle}
          hasStrava={hasStrava}
          hasPassword={hasPassword}
          showActivitySyncLink={isAthlete}
        />

        {isAthlete ? (
          <section id="integrations" className="card-elevated scroll-mt-24 space-y-4 p-5">
            <div>
              <SectionTitle variant="ui">Integrations</SectionTitle>
              <Caption>Connect external services to sync training data.</Caption>
            </div>
            <StravaConnectCard
              connected={connected}
              configured={isStravaConfigured()}
              summary={stravaSummary}
              errorMessage={errorMessage}
              successMessage={successMessage}
            />
          </section>
        ) : null}

        {isAthlete ? (
          <section id="calendar-sync" className="scroll-mt-24">
            <div className="card-elevated p-5">
              <CalendarSyncCard
                feeds={calendarFeeds}
                hasGoogleLinked={Boolean(googleAccount)}
              />
            </div>
          </section>
        ) : null}
      </section>
    </div>
  )
}
