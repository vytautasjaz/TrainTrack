import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { AthleteAvatarForm } from '@/components/settings/athlete-avatar-form'
import { AthleteNameForm } from '@/components/settings/athlete-name-form'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { AthleteCoachConnection } from '@/components/settings/athlete-coach-connection'
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
}: AccountProfileSectionProps) {
  return (
    <section id="profile" className="card-elevated scroll-mt-24 space-y-5 p-5">
      <div>
        <SectionTitle variant="ui">Athlete profile</SectionTitle>
        <Caption>Your photo, name, role, and coach connection.</Caption>
      </div>

      {hasAthlete ? (
        <AthleteAvatarForm
          name={name}
          avatarUrl={avatarUrl}
          stravaConnected={stravaConnected}
        />
      ) : (
        <div className="flex items-center gap-3">
          <AthleteAvatar name={name} avatarUrl={null} size="lg" />
          <Caption>Add an athlete profile to upload a photo.</Caption>
        </div>
      )}

      <AthleteNameForm name={name} mode="inline" />

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Role · {roleLabel(hasAthlete, hasCoach)}
        </p>
        <Caption>{email}</Caption>
      </div>

      {(!hasAthlete || !hasCoach) && (
        <div className="flex flex-wrap gap-2">
          {!hasAthlete ? (
            <form action={startTraining}>
              <Button type="submit" size="sm">
                Start Training
              </Button>
            </form>
          ) : null}
          {!hasCoach ? (
            <form action={becomeCoach}>
              <Button type="submit" variant="outline" size="sm">
                Become a Coach
              </Button>
            </form>
          ) : null}
        </div>
      )}

      {hasCoach && coachingCode ? (
        <div className="rounded-[6px] border border-border/60 px-3 py-2.5">
          <p className="text-sm font-medium">Your coaching code</p>
          <p className="mt-0.5 font-semibold tracking-wide text-foreground">
            {coachingCode}
          </p>
          <Caption className="mt-1">Share this code so athletes can connect to you.</Caption>
        </div>
      ) : null}

      {hasAthlete ? (
        <AthleteCoachConnection
          coachLinks={coachLinks}
          canSelfCoach={hasAthlete && hasCoach}
          currentUserId={currentUserId}
        />
      ) : null}
    </section>
  )
}
