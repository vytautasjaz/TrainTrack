import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { StravaConnectCard } from '@/components/integrations/strava-connect-card'
import { HrZonesForm } from '@/components/settings/hr-zones-form'
import { PaceZonesForm } from '@/components/settings/pace-zones-form'
import { BikeSpeedZonesForm } from '@/components/settings/bike-speed-zones-form'
import { SwimCssForm } from '@/components/settings/swim-css-form'
import { AthleteNameForm } from '@/components/settings/athlete-name-form'
import { AthleteAvatarForm } from '@/components/settings/athlete-avatar-form'
import { CoachPlanningLeadForm } from '@/components/settings/coach-planning-lead-form'
import { CoachWorkoutBuilderPrefsForm } from '@/components/settings/coach-workout-builder-prefs-form'
import { getAthletePreferences } from '@/app/actions/preferences'
import { getSession, resolveAthleteId } from '@/lib/session'
import { isStravaConfigured } from '@/lib/strava/config'
import { getStravaConnectionSummary } from '@/lib/strava/sync'
import { formatPaceMinPerKm, estimateDurationMin } from '@/lib/athlete-preferences'
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

  const isCoach = session.role === 'COACH'
  const isAthlete = session.role === 'ATHLETE' && Boolean(session.athleteId)
  const athleteId = await resolveAthleteId(session)

  const coachUser = isCoach
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
            isCoach
              ? 'Coach planning reminders. Select an athlete to edit their training zones.'
              : 'Select an athlete to manage training preferences.'
          }
        />
        {isCoach ? (
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
  const athleteRow = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { avatarUrl: true, name: true },
  })

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
  const displayName = athleteRow?.name ?? session.name

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Preferences"
        description={
          isAthlete
            ? 'Profile, training zones, heart rate limits, and connected services.'
            : 'Coach reminders, profile, training zones, and heart rate limits.'
        }
      />

      {isCoach ? (
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

      <section className="card-elevated space-y-4 p-5">
        <div>
          <SectionTitle>Profile</SectionTitle>
          <Caption>How your name and photo appear in the app</Caption>
        </div>
        {isAthlete ? (
          <AthleteAvatarForm
            name={displayName}
            avatarUrl={athleteRow?.avatarUrl}
            stravaConnected={connected}
          />
        ) : null}
        <AthleteNameForm name={session.name} />
      </section>

      <section className="card-elevated space-y-4 p-5">
        <div>
          <SectionTitle>Training paces</SectionTitle>
          <Caption>Per-km targets for each intensity level</Caption>
        </div>
        <PaceZonesForm preferences={preferences} />
        {durationPreview != null && easyPace != null && (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-caption">
            Example: a 10 km easy run at {formatPaceMinPerKm(easyPace)}/km ≈ {durationPreview} min
          </p>
        )}
      </section>

      <section className="card-elevated space-y-4 p-5">
        <div>
          <SectionTitle>Bike speed zones</SectionTitle>
          <Caption>
            FTP and default km/h values used for %FTP targets and bike distance/duration estimates
          </Caption>
        </div>
        <BikeSpeedZonesForm preferences={preferences} />
      </section>

      <section className="card-elevated space-y-4 p-5">
        <div>
          <SectionTitle>Critical swim speed</SectionTitle>
          <Caption>CSS per 100m — used to estimate swim duration from distance</Caption>
        </div>
        <SwimCssForm preferences={preferences} />
      </section>

      <section className="card-elevated space-y-4 p-5">
        <div>
          <SectionTitle>Heart rate zones</SectionTitle>
          <Caption>Bpm limits for recovery through VO2 max</Caption>
        </div>
        <HrZonesForm preferences={preferences} />
      </section>

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
        </section>
      )}
    </div>
  )
}
