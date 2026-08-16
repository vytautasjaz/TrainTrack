import { Button } from '@/components/ui/button'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { respondCoachRequest } from '@/app/actions/auth'

export type PendingCoachRequest = {
  id: string
  athlete: { id: string; name: string }
}

type CoachPendingRequestsProps = {
  coachingCode: string
  requests: PendingCoachRequest[]
}

export function CoachPendingRequests({ coachingCode, requests }: CoachPendingRequestsProps) {
  if (requests.length === 0) return null

  return (
    <section className="card-elevated space-y-4 border border-brand/20 bg-brand-soft/30 p-5">
      <div>
        <SectionTitle variant="ui">Pending athlete requests</SectionTitle>
        <Caption>
          {requests.length === 1
            ? '1 athlete wants to connect'
            : `${requests.length} athletes want to connect`}
          {' · '}
          Your code:{' '}
          <span className="font-semibold text-foreground">{coachingCode}</span>
        </Caption>
      </div>
      <ul className="space-y-2">
        {requests.map((link) => (
          <li
            key={link.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border/60 bg-card px-3 py-2.5"
          >
            <span className="text-sm font-medium">{link.athlete.name}</span>
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
    </section>
  )
}
