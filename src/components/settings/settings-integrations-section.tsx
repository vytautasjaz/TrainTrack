'use client'

import { CalendarDays } from 'lucide-react'
import { StravaConnectCard } from '@/components/integrations/strava-connect-card'
import { CalendarSyncCard } from '@/components/integrations/calendar-sync-card'
import { CoachInviteLinkPanel } from '@/components/coach/coach-invite-link-panel'
import { CoachWorkoutBuilderPrefsForm } from '@/components/settings/coach-workout-builder-prefs-form'
import { CoachDurationNotationForm } from '@/components/settings/coach-duration-notation-form'
import { CoachIntensityZonesForm } from '@/components/settings/coach-intensity-zones-form'
import { CoachWorkoutTypePrefsForm } from '@/components/settings/coach-workout-type-prefs-form'
import { StravaMark } from '@/components/plan/strava-mark'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import type { CalendarFeedType } from '@prisma/client'
import type { WorkoutBuilderPrefs } from '@/lib/workout-builder/workout-builder-prefs'
import type { WorkoutTypePrefs } from '@/lib/workout-builder/workout-type-prefs'

type FeedRow = {
  type: CalendarFeedType
  tokenHint: string | null
  googleSyncEnabled: boolean
}

type StravaSummary = {
  stravaAthleteId: string
  scope: string
  expiresAt: Date
  lastSyncedAt: Date | null
  autoSyncEnabled: boolean
  linkedActivities: number
}

type SettingsIntegrationsSectionProps = {
  role: 'athlete' | 'coach'
  strava?: {
    connected: boolean
    configured: boolean
    summary: StravaSummary | null
    errorMessage?: string | null
    successMessage?: string | null
  }
  calendar?: {
    feeds: FeedRow[]
    hasGoogleLinked: boolean
  }
  coachingCode?: string | null
}

export function SettingsIntegrationsSection({
  role,
  strava,
  calendar,
  coachingCode,
}: SettingsIntegrationsSectionProps) {
  if (role === 'coach') {
    return coachingCode ? (
      <SettingsPanel id="integrations" title="Coaching code">
        <CoachInviteLinkPanel coachingCode={coachingCode} compact />
      </SettingsPanel>
    ) : null
  }

  return (
    <>
      {strava ? (
        <SettingsPanel
          id="integrations-strava"
          title="Strava"
          icon={<StravaMark className="h-5 w-5 text-[#FC4C02]" />}
        >
          <StravaConnectCard
            compact
            connected={strava.connected}
            configured={strava.configured}
            summary={strava.summary}
            errorMessage={strava.errorMessage}
            successMessage={strava.successMessage}
          />
        </SettingsPanel>
      ) : null}

      {calendar ? (
        <SettingsPanel
          id="integrations-calendar"
          title="Calendar"
          icon={<CalendarDays className="h-5 w-5 text-[var(--tt-ink-soft,#6b6b6b)]" />}
        >
          <CalendarSyncCard
            compact
            feeds={calendar.feeds}
            hasGoogleLinked={calendar.hasGoogleLinked}
          />
        </SettingsPanel>
      ) : null}
    </>
  )
}

export function SettingsCoachBuilderSection({
  workoutBuilderPrefs,
  workoutTypePrefs,
}: {
  workoutBuilderPrefs: WorkoutBuilderPrefs
  workoutTypePrefs: WorkoutTypePrefs
}) {
  return (
    <>
      <SettingsPanel id="builder-duration" title="Duration format">
        <CoachDurationNotationForm initialPrefs={workoutBuilderPrefs} />
      </SettingsPanel>
      <SettingsPanel id="builder-intensity" title="Intensity zones">
        <CoachIntensityZonesForm initialPrefs={workoutBuilderPrefs} />
      </SettingsPanel>
      <SettingsPanel id="builder-types" title="Workout types">
        <CoachWorkoutTypePrefsForm initialPrefs={workoutTypePrefs} />
      </SettingsPanel>
      <SettingsPanel id="builder-defaults" title="Workout builder">
        <CoachWorkoutBuilderPrefsForm initialPrefs={workoutBuilderPrefs} />
      </SettingsPanel>
    </>
  )
}
