'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { CoachAthleteLinkStatus } from '@prisma/client'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
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
  createdAt: string
  updatedAt: string
  coachProfile: {
    coachingCode: string
    userId: string
    avatarUrl?: string | null
    user: { name: string }
  }
}

type AthleteCoachConnectionProps = {
  coachLinks: CoachLink[]
  canSelfCoach: boolean
  currentUserId: string
}

function formatCoachSince(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy')
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
  const pastCoaches = coachLinks.filter((l) => l.status === CoachAthleteLinkStatus.REMOVED)
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
    <div id="connect-coach" className="scroll-mt-24 space-y-4">
      {acceptedCoach ? (
        <div className="flex items-start gap-4">
          <AthleteAvatar
            name={acceptedCoach.coachProfile.user.name}
            avatarUrl={acceptedCoach.coachProfile.avatarUrl}
            size="xl"
          />
          <div className="min-w-0 flex-1 space-y-3">
            {isSelfCoached ? (
              <div>
                <p className="text-sm text-[var(--tt-ink,#111)]">
                  You are coaching yourself ({acceptedCoach.coachProfile.coachingCode})
                </p>
                <Caption className="mt-0.5">
                  Since {formatCoachSince(acceptedCoach.updatedAt)}
                </Caption>
              </div>
            ) : (
              <div>
                <p className="truncate text-sm font-medium text-foreground">
                  {acceptedCoach.coachProfile.user.name}
                </p>
                <Caption className="mt-0.5">
                  {acceptedCoach.coachProfile.coachingCode} · Since{' '}
                  {formatCoachSince(acceptedCoach.updatedAt)}
                </Caption>
              </div>
            )}
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
          </div>
        </div>
      ) : pendingCoaches.length > 0 ? (
        <ul className="space-y-2">
          {pendingCoaches.map((link) => (
            <li
              key={link.id}
              className="flex items-center gap-3 rounded-[6px] border border-border/60 px-3 py-2 text-sm"
            >
              <AthleteAvatar
                name={link.coachProfile.user.name}
                avatarUrl={link.coachProfile.avatarUrl}
                size="sm"
              />
              <span className="min-w-0 truncate">
                {link.coachProfile.user.name} ({link.coachProfile.coachingCode}) —{' '}
                <span className="text-muted-foreground">pending</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Caption>No coach connected yet.</Caption>
      )}

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

      {pastCoaches.length > 0 ? (
        <div className="border-t border-[var(--tt-line,#ebebeb)] pt-3">
          <p className="text-[13px] font-medium text-[var(--tt-ink,#111)]">Previous coaches</p>
          <ul className="mt-2 space-y-2">
            {pastCoaches.map((link) => {
              const wasSelf = link.coachProfile.userId === currentUserId
              return (
                <li key={link.id} className="flex items-center gap-3">
                  <AthleteAvatar
                    name={link.coachProfile.user.name}
                    avatarUrl={link.coachProfile.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--tt-ink,#111)]">
                      {wasSelf
                        ? `Yourself (${link.coachProfile.coachingCode})`
                        : `${link.coachProfile.user.name} (${link.coachProfile.coachingCode})`}
                    </p>
                    <Caption className="mt-0.5">
                      {formatCoachSince(link.createdAt)} – {formatCoachSince(link.updatedAt)}
                    </Caption>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
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
