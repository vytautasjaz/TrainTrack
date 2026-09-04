'use client'

import { Caption, SectionTitle } from '@/components/ui/typography'
import { CoachInviteLinkPanel } from '@/components/coach/coach-invite-link-panel'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'

type CoachInviteAthleteSectionProps = {
  coachingCode: string
  coachName: string
  embedded?: boolean
}

export function CoachInviteAthleteSection({
  coachingCode,
  coachName,
  embedded = false,
}: CoachInviteAthleteSectionProps) {
  const body = (
    <>
      <CoachInviteLinkPanel coachingCode={coachingCode} />
      <Caption className="mt-3">
        Athletes can also enter your code manually in Profile. Link invite from{' '}
        <span className="font-medium text-foreground">{coachName}</span> skips the code step.
      </Caption>
    </>
  )

  if (embedded) {
    return (
      <SettingsPanel
        id="invite-athlete"
        title="Invite athlete"
        description="Send a personal link. After they register and start training, they connect with you automatically."
      >
        {body}
      </SettingsPanel>
    )
  }

  return (
    <section id="invite-athlete" className="card-elevated scroll-mt-24 space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Invite athlete</SectionTitle>
        <Caption>
          Send a personal link. After they register and start training, they connect with you
          automatically.
        </Caption>
      </div>
      {body}
    </section>
  )
}
