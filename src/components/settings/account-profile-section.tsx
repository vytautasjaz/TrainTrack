import { CoachAthleteLinkStatus } from '@prisma/client'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AthleteAvatarForm } from '@/components/settings/athlete-avatar-form'
import { AthleteNameForm } from '@/components/settings/athlete-name-form'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import {
  becomeCoach,
  requestCoachConnection,
  startTraining,
} from '@/app/actions/auth'

type CoachLink = {
  id: string
  status: CoachAthleteLinkStatus
  coachProfile: {
    coachingCode: string
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
}: AccountProfileSectionProps) {
  const acceptedCoach = coachLinks.find(
    (l) => l.status === CoachAthleteLinkStatus.ACCEPTED,
  )
  const pendingCoaches = coachLinks.filter(
    (l) => l.status === CoachAthleteLinkStatus.PENDING,
  )
  const canConnectCoach = hasAthlete && !acceptedCoach

  return (
    <section id="profile" className="card-elevated scroll-mt-24 space-y-5 p-5">
      <div>
        <SectionTitle>Profile</SectionTitle>
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
        <div id="connect-coach" className="scroll-mt-24 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Your coach</p>
            {acceptedCoach ? (
              <Caption className="mt-1">
                Connected to{' '}
                <span className="font-medium text-foreground">
                  {acceptedCoach.coachProfile.user.name}
                </span>{' '}
                ({acceptedCoach.coachProfile.coachingCode})
              </Caption>
            ) : pendingCoaches.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {pendingCoaches.map((link) => (
                  <li
                    key={link.id}
                    className="rounded-[6px] border border-border/60 px-3 py-2 text-sm"
                  >
                    {link.coachProfile.user.name} ({link.coachProfile.coachingCode}) —{' '}
                    <span className="text-muted-foreground">pending</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Caption className="mt-1">No coach connected yet.</Caption>
            )}
          </div>

          {canConnectCoach ? (
            <form action={requestCoachConnection} className="flex flex-col gap-2 sm:flex-row">
              <Input
                name="coachingCode"
                placeholder="TT-XXXXX"
                required
                className="sm:flex-1 uppercase"
                aria-label="Coach invite code"
              />
              <Button type="submit" variant="secondary" size="sm">
                Connect to a coach
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
