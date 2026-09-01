'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarRange, X } from 'lucide-react'
import { respondCoachRequest } from '@/app/actions/auth'
import { selectAthleteForTraining } from '@/app/actions/athletes'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { CoachingThreadPanel } from '@/components/inbox/coaching-thread-panel'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { CoachHomeMarkHandledButton } from '@/components/coach/coach-home-panel'
import { DATA_TABLE_SHELL } from '@/lib/table-styles'
import type { CoachHomeAttentionItem } from '@/lib/coach-home'
import { formatDateKeyCompact } from '@/lib/dates'
import { cn } from '@/lib/utils'

type CoachHomeAttentionActionPanelProps = {
  item: CoachHomeAttentionItem
  onClose: () => void
  onDismiss: () => void | Promise<void>
}

export function CoachHomeAttentionActionPanel({
  item,
  onClose,
  onDismiss,
}: CoachHomeAttentionActionPanelProps) {
  return (
    <section className="flex min-w-0 flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AthleteAvatar
            name={item.athleteName}
            avatarUrl={item.avatarUrl}
            size="sm"
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[var(--tt-ink)]">
              {item.athleteName}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-soft)]">
              {item.categoryLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close action panel"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--tt-ink-soft)] transition hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink)]"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <div className={cn(DATA_TABLE_SHELL, 'flex min-h-[18rem] flex-col overflow-hidden')}>
        <AttentionActionBody item={item} onClose={onClose} onDismiss={onDismiss} />
      </div>
    </section>
  )
}

function AttentionActionBody({
  item,
  onClose,
  onDismiss,
}: {
  item: CoachHomeAttentionItem
  onClose: () => void
  onDismiss: () => void | Promise<void>
}) {
  const router = useRouter()

  switch (item.action.type) {
    case 'reply':
      return (
        <div className="flex min-h-[18rem] flex-1 flex-col p-3">
          <p className="mb-2 text-[12px] text-[var(--tt-ink-soft)]">{item.action.headline}</p>
          <CoachingThreadPanel
            thread={item.action.thread}
            role="coach"
            compact
            dockComposer
            className="min-h-0 flex-1"
            onUpdated={() => router.refresh()}
          />
          <div className="mt-3 flex justify-end border-t border-[var(--tt-line)] pt-3">
            <CoachHomeMarkHandledButton onMarkHandled={onDismiss} />
          </div>
        </div>
      )
    case 'join_request':
      return (
        <JoinRequestActions
          linkId={item.action.linkId}
          athleteName={item.athleteName}
          onDone={() => {
            onClose()
            router.refresh()
          }}
          onDismiss={onDismiss}
        />
      )
    case 'open_plan':
      return (
        <PlanActionBody
          item={item}
          lastPlannedKey={item.action.lastPlannedKey}
          onDismiss={onDismiss}
        />
      )
    case 'missed_session':
      return <MissedSessionActionBody item={item} onDismiss={onDismiss} />
    case 'review_athlete':
      return <ReviewAthleteActionBody item={item} onDismiss={onDismiss} />
    default:
      return null
  }
}

function JoinRequestActions({
  linkId,
  athleteName,
  onDone,
  onDismiss,
}: {
  linkId: string
  athleteName: string
  onDone: () => void
  onDismiss: () => void | Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function respond(decision: 'accept' | 'reject') {
    setError(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('linkId', linkId)
        formData.set('decision', decision)
        await respondCoachRequest(formData)
        onDone()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not respond to request')
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-4 p-4">
      <p className="text-[13px] leading-snug text-[var(--tt-ink-soft)]">
        <span className="font-semibold text-[var(--tt-ink)]">{athleteName}</span> wants to connect
        as your athlete.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={isPending} onClick={() => respond('accept')}>
          {isPending ? 'Saving…' : 'Approve'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => respond('reject')}
        >
          Decline
        </Button>
        <CoachHomeMarkHandledButton onMarkHandled={onDismiss} />
      </div>
      <FormError message={error} />
    </div>
  )
}

function PlanActionBody({
  item,
  lastPlannedKey,
  onDismiss,
}: {
  item: CoachHomeAttentionItem
  lastPlannedKey: string | null
  onDismiss: () => void | Promise<void>
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 p-4">
      <p className="text-[13px] leading-snug text-[var(--tt-ink-soft)]">{item.description}</p>
      {lastPlannedKey ? (
        <p className="text-[12px] text-[var(--tt-ink-faint)]">
          Last planned: {formatDateKeyCompact(lastPlannedKey)}
        </p>
      ) : (
        <p className="text-[12px] text-[var(--tt-ink-faint)]">No upcoming workouts planned.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <OpenPlanButton athleteId={item.athleteId} />
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={`/athletes/${item.athleteId}`}>View athlete</Link>
        </Button>
        <CoachHomeMarkHandledButton onMarkHandled={onDismiss} />
      </div>
    </div>
  )
}

function MissedSessionActionBody({
  item,
  onDismiss,
}: {
  item: CoachHomeAttentionItem
  onDismiss: () => void | Promise<void>
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 p-4">
      <p className="text-[13px] leading-snug text-[var(--tt-ink-soft)]">{item.description}</p>
      {item.workoutTitle ? (
        <div className="flex items-start gap-2">
          {item.workoutType ? (
            <WorkoutSportIcon type={item.workoutType} size="xs" className="mt-0.5 shrink-0" />
          ) : null}
          <div>
            <p className="text-[13px] font-semibold text-[var(--tt-ink)]">{item.workoutTitle}</p>
            {item.workoutDateKey ? (
              <p className="text-[12px] text-[var(--tt-ink-faint)]">
                {formatDateKeyCompact(item.workoutDateKey)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={`/athletes/${item.athleteId}`}>View athlete</Link>
        </Button>
        <OpenPlanButton athleteId={item.athleteId} label="Open plan" />
        <CoachHomeMarkHandledButton onMarkHandled={onDismiss} />
      </div>
    </div>
  )
}

function ReviewAthleteActionBody({
  item,
  onDismiss,
}: {
  item: CoachHomeAttentionItem
  onDismiss: () => void | Promise<void>
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 p-4">
      <p className="text-[13px] leading-snug text-[var(--tt-ink-soft)]">{item.description}</p>
      {item.contextLine ? (
        <p className="text-[12px] text-[var(--tt-ink-faint)]">{item.contextLine}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" asChild>
          <Link href={`/athletes/${item.athleteId}`}>View athlete</Link>
        </Button>
        <OpenPlanButton athleteId={item.athleteId} variant="outline" label="Open plan" />
        <CoachHomeMarkHandledButton onMarkHandled={onDismiss} />
      </div>
    </div>
  )
}

function OpenPlanButton({
  athleteId,
  label = 'Open plan',
  variant = 'secondary',
}: {
  athleteId: string
  label?: string
  variant?: 'secondary' | 'outline'
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await selectAthleteForTraining(formData)
        })
      }}
    >
      <input type="hidden" name="athleteId" value={athleteId} />
      <Button type="submit" variant={variant} size="sm" disabled={isPending}>
        <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        {isPending ? 'Opening…' : label}
      </Button>
    </form>
  )
}
