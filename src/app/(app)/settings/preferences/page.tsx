import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { StravaConnectCard } from '@/components/integrations/strava-connect-card'
import { CalendarSyncCard } from '@/components/integrations/calendar-sync-card'
import { CoachPlanningLeadForm } from '@/components/settings/coach-planning-lead-form'
import { CoachWorkoutBuilderPrefsForm } from '@/components/settings/coach-workout-builder-prefs-form'
import { TrainingZonesTabs } from '@/components/settings/training-zones-tabs'
import { getAthletePreferences } from '@/app/actions/preferences'
import { getCalendarFeedSummaries } from '@/app/actions/preferences'
import { getSession, resolveAthleteId, isCoach} from '@/lib/session'
import { isStravaConfigured } from '@/lib/strava/config'
import { getStravaConnectionSummary } from '@/lib/strava/sync'
import {
  clampPlanningLeadDays,
  DEFAULT_PLANNING_LEAD_DAYS,
} from '@/lib/queries'
import { parseWorkoutBuilderPrefs } from '@/lib/workout-builder/workout-builder-prefs'
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

  const coach = isCoach(session)
  const isAthlete = session.hasAthlete && Boolean(session.athleteId)
  const athleteId = await resolveAthleteId(session)

  const coachUser = coach
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { planningLeadDays: true, workoutBuilderPrefs: true },
      })
    : null
  const planningLeadDays = clampPlanningLeadDays(
    coachUser?.planningLeadDays ?? DEFAULT_PLANNING_LEAD_DAYS,
  )
  const workoutBuilderPrefs = parseWorkoutBuilderPrefs(coachUser?.workoutBuilderPrefs)

  if (!athleteId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Preferences"
          description={
            coach
              ? 'Coach planning reminders. Select an athlete to edit their training zones.'
              : 'Select an athlete to manage training preferences.'
          }
        />
        {coach ? (
          <>
            <section className="card-elevated space-y-4 p-5">
              <div>
                <SectionTitle>Plan-ahead reminders</SectionTitle>
                <Caption>
                  Get a dashboard warning when an active athlete does not have workouts planned far
                  enough ahead.
                </Caption>
              </div>
              <CoachPlanningLeadForm planningLeadDays={planningLeadDays} />
            </section>
            <section className="card-elevated space-y-4 p-5">
              <div>
                <SectionTitle>Workout builder preferences</SectionTitle>
                <Caption>
                  Customize Add Block presets per sport — order, labels, and default duration /
                  intensity when you insert a block.
                </Caption>
              </div>
              <CoachWorkoutBuilderPrefsForm initialPrefs={workoutBuilderPrefs} />
            </section>
          </>
        ) : (
          <Caption>No athlete profile available.</Caption>
        )}
      </div>
    )
  }

  const preferences = (await getAthletePreferences(athleteId)) ?? {}

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Preferences"
        description={
          isAthlete
            ? 'Training zones, heart rate limits, and connected services.'
            : 'Coach reminders, training zones, and heart rate limits.'
        }
      />

      {coach ? (
        <>
          <section className="card-elevated space-y-4 p-5">
            <div>
              <SectionTitle>Plan-ahead reminders</SectionTitle>
              <Caption>
                Warn on the dashboard when an active athlete has no workouts planned this many days
                ahead. Mark athletes Active / Inactive when editing their profile.
              </Caption>
            </div>
            <CoachPlanningLeadForm planningLeadDays={planningLeadDays} />
          </section>
          <section className="card-elevated space-y-4 p-5">
            <div>
              <SectionTitle>Workout builder preferences</SectionTitle>
              <Caption>
                Customize Add Block presets per sport — order, labels, and default duration /
                intensity when you insert a block.
              </Caption>
            </div>
            <CoachWorkoutBuilderPrefsForm initialPrefs={workoutBuilderPrefs} />
          </section>
        </>
      ) : null}

      <TrainingZonesTabs preferences={preferences} />

      {isAthlete && (
        <section id="integrations" className="card-elevated space-y-4 p-5">
          <div>
            <SectionTitle>Integrations</SectionTitle>
            <Caption>Connect external services to sync training data</Caption>
          </div>
          <StravaConnectCard
            connected={connected}
            configured={isStravaConfigured()}
            summary={stravaSummary}
            errorMessage={errorMessage}
            successMessage={successMessage}
          />
          <CalendarSyncCard
            feeds={calendarFeeds}
            hasGoogleLinked={Boolean(googleAccount)}
          />
        </section>
      )}
    </div>
  )
}
