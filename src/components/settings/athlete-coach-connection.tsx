'use client'

import { useState, useTransition } from 'react'
import { CoachAthleteLinkStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Caption } from '@/components/ui/typography'
import { FormMessage } from '@/components/ui/form-field'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  coachMyself,
  leaveCoach,
  requestCoachConnection,
  switchCoach,
} from '@/app/actions/auth'
import { isRedirectError } from '@/lib/auth-form-errors'

type CoachLink = {
  id: string
  status: CoachAthleteLinkStatus
  coachProfile: {
    coachingCode: string
    userId: string
    user: { name: string }
  }
}

type AthleteCoachConnectionProps = {
  coachLinks: CoachLink[]
  canSelfCoach: boolean
  currentUserId: string
}

export function AthleteCoachConnection({
  coachLinks,
  canSelfCoach,
  currentUserId,
}: AthleteCoachConnectionProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  const acceptedCoach = coachLinks.find((l) => l.status === CoachAthleteLinkStatus.ACCEPTED)
  const pendingCoaches = coachLinks.filter((l) => l.status === CoachAthleteLinkStatus.PENDING)
  const isSelfCoached =
    Boolean(acceptedCoach) && acceptedCoach!.coachProfile.userId === currentUserId

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        setSwitchOpen(false)
        setLeaveOpen(false)
      } catch (err) {
        if (isRedirectError(err)) throw err
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <div id="connect-coach" className="scroll-mt-24 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Your coach</p>
        {acceptedCoach ? (
          isSelfCoached ? (
            <Caption className="mt-1">
              You are coaching yourself ({acceptedCoach.coachProfile.coachingCode})
            </Caption>
          ) : (
            <Caption className="mt-1">
              Connected to{' '}
              <span className="font-medium text-foreground">
                {acceptedCoach.coachProfile.user.name}
              </span>{' '}
              ({acceptedCoach.coachProfile.coachingCode})
            </Caption>
          )
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

      {acceptedCoach ? (
        <div className="flex flex-wrap gap-2">
          {canSelfCoach && !isSelfCoached ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => run(() => coachMyself())}
            >
              {pending ? 'Saving…' : 'Coach myself'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => {
              setError(null)
              setSwitchOpen((open) => !open)
            }}
          >
            {switchOpen ? 'Cancel switch' : 'Switch coach'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setLeaveOpen(true)}
          >
            Leave coach
          </Button>
        </div>
      ) : null}

      {!acceptedCoach && canSelfCoach ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(() => coachMyself())}
        >
          {pending ? 'Saving…' : 'Coach myself'}
        </Button>
      ) : null}

      {acceptedCoach && switchOpen ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            run(() => switchCoach(formData))
          }}
        >
          <Input
            name="coachingCode"
            placeholder="Coach code TT-XXXXX"
            required
            className="sm:flex-1 uppercase"
            aria-label="Coach invite code"
            disabled={pending}
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Switching…' : 'Switch'}
          </Button>
        </form>
      ) : null}

      {!acceptedCoach ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            run(() => requestCoachConnection(formData))
          }}
        >
          <Input
            name="coachingCode"
            placeholder="TT-XXXXX"
            required
            className="sm:flex-1 uppercase"
            aria-label="Coach invite code"
            disabled={pending}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? 'Connecting…' : 'Connect to a coach'}
          </Button>
        </form>
      ) : null}

      {error ? <FormMessage variant="error">{error}</FormMessage> : null}

      {acceptedCoach && switchOpen ? (
        <Caption>
          Enter another coach’s code for a pending request, or your own code to coach yourself
          (applies immediately).
        </Caption>
      ) : null}

      {!acceptedCoach && canSelfCoach ? (
        <Caption>
          Use <span className="font-medium text-foreground">Coach myself</span> to plan your own
          training, or enter another coach’s invite code.
        </Caption>
      ) : null}

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave this coach?"
        description={
          acceptedCoach
            ? isSelfCoached
              ? 'You’ll stop self-coaching. Your training data stays on your account — you can connect to a coach or coach yourself again anytime.'
              : `You’ll disconnect from ${acceptedCoach.coachProfile.user.name}. Your training data stays on your account — you can connect to another coach anytime.`
            : undefined
        }
        confirmLabel="Leave coach"
        pending={pending}
        onConfirm={() => run(() => leaveCoach())}
      />
    </div>
  )
}
