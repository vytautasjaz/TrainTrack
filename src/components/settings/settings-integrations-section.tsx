'use client'

import { StravaConnectCard } from '@/components/integrations/strava-connect-card'
import { CalendarSyncCard } from '@/components/integrations/calendar-sync-card'
import { CoachInviteLinkPanel } from '@/components/coach/coach-invite-link-panel'
import { CoachPlanningLeadForm } from '@/components/settings/coach-planning-lead-form'
import { CoachWorkoutBuilderPrefsForm } from '@/components/settings/coach-workout-builder-prefs-form'
import { CoachWorkoutTypePrefsForm } from '@/components/settings/coach-workout-type-prefs-form'
import {
  SettingsGroup,
  SettingsPanel,
} from '@/components/settings/settings-section-chrome'
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
  return (
    <SettingsPanel
      id="integrations"
      title="Integrations"
      description={
        role === 'coach'
          ? 'Share your coaching code and connect external services.'
          : 'Strava sync and calendar feeds. Unlink actions stay secondary.'
      }
    >
      {role === 'coach' && coachingCode ? (
        <SettingsGroup label="Coaching code" description="Athletes use this to request coaching.">
          <CoachInviteLinkPanel coachingCode={coachingCode} compact />
        </SettingsGroup>
      ) : null}

      {role === 'athlete' && strava ? (
        <SettingsGroup label="Strava">
          <StravaConnectCard
            connected={strava.connected}
            configured={strava.configured}
            summary={strava.summary}
            errorMessage={strava.errorMessage}
            successMessage={strava.successMessage}
          />
        </SettingsGroup>
      ) : null}

      {role === 'athlete' && calendar ? (
        <SettingsGroup label="Calendar feed">
          <CalendarSyncCard feeds={calendar.feeds} hasGoogleLinked={calendar.hasGoogleLinked} />
        </SettingsGroup>
      ) : null}
    </SettingsPanel>
  )
}

export function SettingsCoachPlanningSection({
  planningLeadDays,
}: {
  planningLeadDays: number
}) {
  return (
    <SettingsPanel
      id="planning"
      title="Planning lead"
      description="How many days ahead you typically plan — drives underplanned warnings."
    >
      <CoachPlanningLeadForm planningLeadDays={planningLeadDays} />
    </SettingsPanel>
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
    <SettingsPanel
      id="builder"
      title="Builder preferences"
      description="Defaults for new workouts and session-type presets."
    >
      <SettingsGroup label="Workout types">
        <CoachWorkoutTypePrefsForm initialPrefs={workoutTypePrefs} />
      </SettingsGroup>
      <SettingsGroup label="Workout builder">
        <CoachWorkoutBuilderPrefsForm initialPrefs={workoutBuilderPrefs} />
      </SettingsGroup>
    </SettingsPanel>
  )
}
