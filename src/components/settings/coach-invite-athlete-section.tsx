'use client'

import { Caption, SectionTitle } from '@/components/ui/typography'
import { CoachInviteLinkPanel } from '@/components/coach/coach-invite-link-panel'

type CoachInviteAthleteSectionProps = {
  coachingCode: string
  coachName: string
}

export function CoachInviteAthleteSection({
  coachingCode,
  coachName,
}: CoachInviteAthleteSectionProps) {
  return (
    <section id="invite-athlete" className="card-elevated scroll-mt-24 space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Invite athlete</SectionTitle>
        <Caption>
          Send a personal link. After they register, they’ll be asked to accept you as their coach.
        </Caption>
      </div>

      <div className="rounded-[6px] border border-border/60 bg-muted/20 px-3 py-3">
        <CoachInviteLinkPanel coachingCode={coachingCode} />
      </div>

      <Caption>
        Athletes can also enter your code manually in Profile. Link invite from{' '}
        <span className="font-medium text-foreground">{coachName}</span> skips the code step.
      </Caption>
    </section>
  )
}
