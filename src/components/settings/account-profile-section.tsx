'use client'

import { useTransition } from 'react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { AthleteAvatarForm } from '@/components/settings/athlete-avatar-form'
import { CoachAvatarForm } from '@/components/settings/coach-avatar-form'
import { AthleteNameForm } from '@/components/settings/athlete-name-form'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { AthleteCoachConnection } from '@/components/settings/athlete-coach-connection'
import {
  SettingsGroup,
  SettingsPanel,
} from '@/components/settings/settings-section-chrome'
import { becomeCoach, startTraining } from '@/app/actions/auth'
import type { CoachAthleteLinkStatus } from '@prisma/client'

type CoachLink = {
  id: string
  status: CoachAthleteLinkStatus
  coachProfile: {
    coachingCode: string
    userId: string
    user: { name: string }
  }
}

type AccountProfileSectionProps = {
  name: string
  email: string
  hasAthlete: boolean
  hasCoach: boolean
  coachingCode?: string | null
  avatarUrl?: string | null
  stravaConnected?: boolean
  coachLinks?: CoachLink[]
  currentUserId: string
  /** Active workspace — which profile photo/name to edit. */
  profileRole?: 'athlete' | 'coach'
  /** When true, omit outer card chrome (unified Settings page). */
  embedded?: boolean
}

function roleLabel(hasAthlete: boolean, hasCoach: boolean): string {
  if (hasAthlete && hasCoach) return 'Athlete & Coach'
  if (hasCoach) return 'Coach'
  if (hasAthlete) return 'Athlete'
  return 'No role yet'
}

export function AccountProfileSection({
  name,
  email,
  hasAthlete,
  hasCoach,
  coachingCode = null,
  avatarUrl = null,
  stravaConnected = false,
  coachLinks = [],
  currentUserId,
  profileRole = hasCoach && !hasAthlete ? 'coach' : 'athlete',
  embedded = false,
}: AccountProfileSectionProps) {
  const [rolePending, startRoleTransition] = useTransition()
  const editingCoach = profileRole === 'coach' && hasCoach
  const editingAthlete = !editingCoach && hasAthlete

  const photoBlock = editingCoach ? (
    <CoachAvatarForm name={name} avatarUrl={avatarUrl} />
  ) : editingAthlete ? (
    <AthleteAvatarForm
      name={name}
      avatarUrl={avatarUrl}
      stravaConnected={stravaConnected}
    />
  ) : (
    <div className="flex items-center gap-3">
      <AthleteAvatar name={name} avatarUrl={null} size="lg" />
      <Caption>
        {hasCoach
          ? 'Switch to athlete view to set an athlete photo.'
          : 'Add an athlete profile to upload a photo.'}
      </Caption>
    </div>
  )

  const nameBlock = editingCoach ? (
    <AthleteNameForm name={name} mode="inline" profile="coach" />
  ) : editingAthlete ? (
    <AthleteNameForm name={name} mode="inline" profile="athlete" />
  ) : (
    <p className="text-base font-semibold text-foreground">{name}</p>
  )

  const dualHint =
    hasAthlete && hasCoach ? (
      <Caption>
        {editingCoach
          ? 'Editing your coach profile. Switch to athlete view for your athlete name and photo.'
          : 'Editing your athlete profile. Switch to coach view for your coach name and photo.'}
      </Caption>
    ) : null

  const body = embedded ? (
    <>
      <div className="tt-settings-group">
        {photoBlock}
        <div className="mt-4">{nameBlock}</div>
        {dualHint ? <div className="mt-2">{dualHint}</div> : null}
        <div className="mt-4 space-y-1">
          <p className="text-[13px] font-medium text-[var(--tt-ink,#111)]">
            Role · {roleLabel(hasAthlete, hasCoach)}
          </p>
          <Caption>{email}</Caption>
        </div>
        {(!hasAthlete || !hasCoach) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {!hasAthlete ? (
              <form
                action={() => {
                  startRoleTransition(async () => {
                    await startTraining()
                  })
                }}
              >
                <Button type="submit" size="sm" disabled={rolePending}>
                  {rolePending ? 'Saving…' : 'Start Training'}
                </Button>
              </form>
            ) : null}
            {!hasCoach ? (
              <form
                action={() => {
                  startRoleTransition(async () => {
                    await becomeCoach()
                  })
                }}
              >
                <Button type="submit" variant="outline" size="sm" disabled={rolePending}>
                  {rolePending ? 'Saving…' : 'Become a Coach'}
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </div>

      {hasCoach && coachingCode ? (
        <SettingsGroup label="Coaching code">
          <p className="font-semibold tracking-wide text-[var(--tt-ink,#111)]">{coachingCode}</p>
        </SettingsGroup>
      ) : null}

      {hasAthlete && !editingCoach ? (
        <SettingsGroup label="Coach connection">
          <AthleteCoachConnection
            coachLinks={coachLinks}
            canSelfCoach={hasAthlete && hasCoach}
            currentUserId={currentUserId}
          />
        </SettingsGroup>
      ) : null}
    </>
  ) : (
    <>
      {photoBlock}
      {nameBlock}
      {dualHint}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Role · {roleLabel(hasAthlete, hasCoach)}
        </p>
        <Caption>{email}</Caption>
      </div>
      {(!hasAthlete || !hasCoach) && (
        <div className="flex flex-wrap gap-2">
          {!hasAthlete ? (
            <form
              action={() => {
                startRoleTransition(async () => {
                  await startTraining()
                })
              }}
            >
              <Button type="submit" size="sm" disabled={rolePending}>
                {rolePending ? 'Saving…' : 'Start Training'}
              </Button>
            </form>
          ) : null}
          {!hasCoach ? (
            <form
              action={() => {
                startRoleTransition(async () => {
                  await becomeCoach()
                })
              }}
            >
              <Button type="submit" variant="outline" size="sm" disabled={rolePending}>
                {rolePending ? 'Saving…' : 'Become a Coach'}
              </Button>
            </form>
          ) : null}
        </div>
      )}
      {hasCoach && coachingCode ? (
        <div className="rounded-[6px] border border-border/60 px-3 py-2.5">
          <p className="text-sm font-medium">Your coaching code</p>
          <p className="mt-0.5 font-semibold tracking-wide text-foreground">{coachingCode}</p>
        </div>
      ) : null}
      {hasAthlete && !editingCoach ? (
        <AthleteCoachConnection
          coachLinks={coachLinks}
          canSelfCoach={hasAthlete && hasCoach}
          currentUserId={currentUserId}
        />
      ) : null}
    </>
  )

  const title = editingCoach ? 'Coach profile' : 'Athlete profile'
  const description = editingCoach
    ? 'How athletes see you — coach name and photo.'
    : 'Identity and how you show up as an athlete.'

  if (embedded) {
    return (
      <SettingsPanel id="profile" title={title} description={description}>
        {body}
      </SettingsPanel>
    )
  }

  return (
    <section id="profile" className="card-elevated scroll-mt-24 space-y-5 p-5">
      <div>
        <SectionTitle variant="ui">{title}</SectionTitle>
        <Caption>{description}</Caption>
      </div>
      {body}
    </section>
  )
}
