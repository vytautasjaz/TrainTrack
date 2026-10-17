'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { AthleteAvatarForm } from '@/components/settings/athlete-avatar-form'
import { CoachAvatarForm } from '@/components/settings/coach-avatar-form'
import { AthleteNameForm } from '@/components/settings/athlete-name-form'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { AthleteCoachConnection } from '@/components/settings/athlete-coach-connection'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { becomeCoach, startTraining } from '@/app/actions/auth'
import type { CoachAthleteLinkStatus } from '@prisma/client'

function CoachingCodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <p className="font-semibold tracking-wide text-[var(--tt-ink,#111)]">{code}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 px-0 text-muted-foreground"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy coaching code'}
      >
        {copied ? (
          <Check className="h-4 w-4 text-brand" strokeWidth={2} aria-hidden />
        ) : (
          <Copy className="h-4 w-4" strokeWidth={2} aria-hidden />
        )}
      </Button>
    </div>
  )
}

type CoachLink = {
  id: string
  status: CoachAthleteLinkStatus
  createdAt: string
  updatedAt: string
  coachProfile: {
    coachingCode: string
    userId: string
    avatarUrl?: string | null
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
  profileRole?: 'athlete' | 'coach'
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
          ? 'Editing coach profile. Switch to athlete view for athlete name and photo.'
          : 'Editing athlete profile. Switch to coach view for coach name and photo.'}
      </Caption>
    ) : null

  const identityBody = (
    <div className="space-y-4">
      {photoBlock}
      {nameBlock}
      {dualHint}
      <div className="space-y-1">
        <p className="text-[13px] font-medium text-[var(--tt-ink,#111)]">
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
    </div>
  )

  const title = editingCoach ? 'Coach profile' : 'Athlete profile'

  if (embedded) {
    const panels: ReactNode[] = [
      <SettingsPanel key="profile" id="profile" title={title}>
        {identityBody}
      </SettingsPanel>,
    ]

    if (hasCoach && coachingCode) {
      panels.push(
        <SettingsPanel key="coaching-code" id="coaching-code" title="Coaching code">
          <CoachingCodeCopy code={coachingCode} />
        </SettingsPanel>,
      )
    }

    if (hasAthlete && !editingCoach) {
      panels.push(
        <SettingsPanel key="coach-connection" id="coach-connection" title="Coach connection">
          <AthleteCoachConnection
            coachLinks={coachLinks}
            canSelfCoach={hasAthlete && hasCoach}
            currentUserId={currentUserId}
          />
        </SettingsPanel>,
      )
    }

    return <>{panels}</>
  }

  return (
    <section id="profile" className="card-elevated scroll-mt-24 space-y-5 p-5">
      <div>
        <SectionTitle variant="ui">{title}</SectionTitle>
      </div>
      {identityBody}
      {hasCoach && coachingCode ? (
        <div className="rounded-[6px] border border-border/60 px-3 py-2.5">
          <p className="text-sm font-medium">Your coaching code</p>
          <div className="mt-0.5">
            <CoachingCodeCopy code={coachingCode} />
          </div>
        </div>
      ) : null}
      {hasAthlete && !editingCoach ? (
        <AthleteCoachConnection
          coachLinks={coachLinks}
          canSelfCoach={hasAthlete && hasCoach}
          currentUserId={currentUserId}
        />
      ) : null}
    </section>
  )
}
