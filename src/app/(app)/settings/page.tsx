import { redirect } from 'next/navigation'
import { CoachAthleteLinkStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Caption } from '@/components/ui/typography'
import { AccountProfileSection } from '@/components/settings/account-profile-section'
import { CoachInviteAthleteSection } from '@/components/settings/coach-invite-athlete-section'
import { PlanViewModePreferenceForm } from '@/components/settings/plan-view-mode-preference-form'
import { SettingsShell } from '@/components/settings/settings-shell'
import {
  SettingsCoachBuilderSection,
  SettingsCoachPlanningSection,
  SettingsIntegrationsSection,
} from '@/components/settings/settings-integrations-section'
import { SignInMethodsSection } from '@/components/settings/sign-in-methods-section'
import { TrainingZonesTabs } from '@/components/settings/training-zones-tabs'
import { WeatherLocationForm } from '@/components/settings/weather-location-form'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { getAthletePreferences } from '@/app/actions/preferences'
import { getCalendarFeedSummaries } from '@/app/actions/preferences'
import { respondCoachRequest } from '@/app/actions/auth'
import { getSession, isCoach, isCoachView, resolveAthleteId } from '@/lib/session'
import { settingsNavForRole } from '@/lib/settings-nav'
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

export default async function SettingsPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/')

  const coachView = isCoachView(session)
  const nav = settingsNavForRole(coachView)
  const isAthlete = session.hasAthlete && Boolean(session.athleteId)
  const athleteId = await resolveAthleteId(session)

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      roles: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
      planningLeadDays: true,
      workoutBuilderPrefs: true,
      coachProfile: {
        select: {
          coachingCode: true,
          links: {
            where: { status: CoachAthleteLinkStatus.PENDING },
            include: {
              athlete: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      athleteProfile: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          coachLinks: {
            where: {
              status: {
                in: [CoachAthleteLinkStatus.PENDING, CoachAthleteLinkStatus.ACCEPTED],
              },
            },
            include: {
              coachProfile: {
                select: {
                  coachingCode: true,
                  userId: true,
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const hasCoach =
    Boolean(user.coachProfile) || session.hasCoach || isCoach(session)
  const displayName = user.athleteProfile?.name ?? user.name

  const providers = new Set(user.accounts.map((a) => a.provider))
  const hasGoogle = providers.has('google')
  const hasPassword = Boolean(user.passwordHash)

  const planningLeadDays = clampPlanningLeadDays(
    user.planningLeadDays ?? DEFAULT_PLANNING_LEAD_DAYS,
  )
  const workoutBuilderPrefs = parseWorkoutBuilderPrefs(user.workoutBuilderPrefs)
  const workoutTypePrefs = parseWorkoutTypePrefs(user.workoutBuilderPrefs)

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

  const ownAthleteId = user.athleteProfile?.id ?? null
  const editingSelectedAthlete =
    coachView && Boolean(athleteId) && athleteId !== ownAthleteId

  const athletePreferences =
    isAthlete && ownAthleteId && !editingSelectedAthlete
      ? ((await getAthletePreferences(ownAthleteId)) ?? {})
      : null

  const weatherLocation =
    isAthlete && ownAthleteId
      ? await prisma.athlete.findUnique({
          where: { id: ownAthleteId },
          select: {
            weatherLocationName: true,
            weatherLat: true,
            weatherLon: true,
            showWeather: true,
          },
        })
      : null

  const stravaConnected = Boolean(stravaSummary)
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? 'Something went wrong.' : null
  const successMessage = params.connected === '1' ? 'Strava connected successfully.' : null

  const profileExtras =
    hasCoach && user.coachProfile ? (
      <>
        <CoachInviteAthleteSection
          embedded
          coachingCode={user.coachProfile.coachingCode}
          coachName={displayName}
        />
        <SettingsPanel
          id="pending-requests"
          title="Pending athlete requests"
          description={`Athletes who entered your code ${user.coachProfile.coachingCode} manually.`}
        >
          {user.coachProfile.links.length === 0 ? (
            <Caption>No pending requests.</Caption>
          ) : (
            <ul className="space-y-2">
              {user.coachProfile.links.map((link) => (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-[var(--tt-line,#ebebeb)] bg-white px-3 py-2"
                >
                  <span className="text-[13px] font-medium">{link.athlete.name}</span>
                  <div className="flex gap-2">
                    <form action={respondCoachRequest}>
                      <input type="hidden" name="linkId" value={link.id} />
                      <input type="hidden" name="decision" value="accept" />
                      <Button type="submit" size="sm">
                        Accept
                      </Button>
                    </form>
                    <form action={respondCoachRequest}>
                      <input type="hidden" name="linkId" value={link.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <Button type="submit" size="sm" variant="outline">
                        Reject
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SettingsPanel>
      </>
    ) : null

  return (
    <div className="tt-dashboard-page -mx-4 px-4 pb-8 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
      <div className="tt-dashboard-content">
        <SettingsShell
          nav={nav}
          isCoachView={coachView}
          sections={{
            profile: (
              <>
                <AccountProfileSection
                  embedded
                  name={displayName}
                  email={user.email}
                  hasAthlete={session.hasAthlete}
                  hasCoach={hasCoach}
                  coachingCode={user.coachProfile?.coachingCode}
                  avatarUrl={user.athleteProfile?.avatarUrl}
                  stravaConnected={stravaConnected}
                  coachLinks={user.athleteProfile?.coachLinks ?? []}
                  currentUserId={user.id}
                />
                {coachView ? profileExtras : null}
              </>
            ),
            'sign-in': (
              <SignInMethodsSection embedded hasGoogle={hasGoogle} hasPassword={hasPassword} />
            ),
            zones:
              athletePreferences && !coachView ? (
                <TrainingZonesTabs embedded preferences={athletePreferences} />
              ) : null,
            weather:
              isAthlete && ownAthleteId && !coachView ? (
                <WeatherLocationForm
                  embedded
                  initial={{
                    name: weatherLocation?.weatherLocationName ?? null,
                    lat: weatherLocation?.weatherLat ?? null,
                    lon: weatherLocation?.weatherLon ?? null,
                  }}
                  showWeather={weatherLocation?.showWeather ?? true}
                />
              ) : null,
            plan: !coachView ? <PlanViewModePreferenceForm embedded /> : null,
            integrations: (
              <SettingsIntegrationsSection
                role={coachView ? 'coach' : 'athlete'}
                coachingCode={user.coachProfile?.coachingCode}
                strava={
                  isAthlete
                    ? {
                        connected: stravaConnected,
                        configured: isStravaConfigured(),
                        summary: stravaSummary,
                        errorMessage,
                        successMessage,
                      }
                    : undefined
                }
                calendar={
                  isAthlete
                    ? {
                        feeds: calendarFeeds,
                        hasGoogleLinked: Boolean(googleAccount),
                      }
                    : undefined
                }
              />
            ),
            planning: coachView ? (
              <SettingsCoachPlanningSection planningLeadDays={planningLeadDays} />
            ) : null,
            builder: coachView ? (
              <SettingsCoachBuilderSection
                workoutBuilderPrefs={workoutBuilderPrefs}
                workoutTypePrefs={workoutTypePrefs}
              />
            ) : null,
          }}
        />
      </div>
    </div>
  )
}
