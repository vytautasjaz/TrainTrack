'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  dismissCoachHomeAttentionItem,
  dismissCoachHomeAttentionItems,
} from '@/app/actions/coach-home'
import { CoachHomeAttentionActionPanel } from '@/components/coach/coach-home-attention-action-panel'
import { CoachHomeCoachingRequests } from '@/components/coach/coach-home-coaching-requests'
import type { CoachHomeCoachingRequest } from '@/components/coach/coach-home-coaching-requests'
import { CoachHomeNeedsAttentionSection } from '@/components/coach/coach-home-needs-attention-section'
import { CoachHomeEmptyState } from '@/components/coach/coach-home-empty-state'
import { CoachHomeMobileHero } from '@/components/coach/coach-home-mobile-hero'
import { CoachHomePlanningCoverage } from '@/components/coach/coach-home-planning-coverage'
import { CoachHomeRecentActivityTable } from '@/components/coach/coach-home-recent-activity-table'
import {
  CoachHomeActivityTableRow,
  CoachHomeAttentionItem,
  CoachHomePlanningCoverageRow,
  coachHomeAttentionContextAt,
} from '@/lib/coach-home'
import { cn } from '@/lib/utils'

const HANDLED_FLASH_MS = 420
const EXIT_ANIMATION_MS = 240

type CoachHomeClientProps = {
  greeting: string
  coachName: string
  attentionItems: CoachHomeAttentionItem[]
  coachingRequests: CoachHomeCoachingRequest[]
  planningCoverageRows: CoachHomePlanningCoverageRow[]
  needsPlanCount: number
  planningLeadDays: number
  activityRows: CoachHomeActivityTableRow[]
  athleteOptions: Array<{ id: string; name: string }>
  totalAthletes: number
  coachingCode: string | null
}

export function CoachHomeClient({
  greeting,
  coachName,
  attentionItems,
  coachingRequests,
  planningCoverageRows,
  needsPlanCount,
  planningLeadDays,
  activityRows,
  athleteOptions,
  totalAthletes,
  coachingCode,
}: CoachHomeClientProps) {
  const router = useRouter()
  const [, startDismiss] = useTransition()
  const dismissTimers = useRef<number[]>([])
  const [selectedAttentionId, setSelectedAttentionId] = useState<string | null>(null)
  const [handledIds, setHandledIds] = useState<Set<string>>(() => new Set())
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set())
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set())

  const filteredAttention = useMemo(() => {
    return attentionItems.filter((item) => !removedIds.has(item.id))
  }, [attentionItems, removedIds])

  const selectedAttentionItem = useMemo(
    () => filteredAttention.find((item) => item.id === selectedAttentionId) ?? null,
    [filteredAttention, selectedAttentionId],
  )

  useEffect(() => {
    if (
      selectedAttentionId &&
      !filteredAttention.some((item) => item.id === selectedAttentionId)
    ) {
      setSelectedAttentionId(null)
    }
  }, [filteredAttention, selectedAttentionId])

  useEffect(() => {
    setRemovedIds((current) => {
      const next = new Set(
        [...current].filter((id) => attentionItems.some((item) => item.id === id)),
      )
      return next.size === current.size ? current : next
    })
  }, [attentionItems])

  useEffect(() => {
    return () => {
      for (const timerId of dismissTimers.current) {
        window.clearTimeout(timerId)
      }
    }
  }, [])

  function persistDismiss(item: CoachHomeAttentionItem) {
    startDismiss(async () => {
      const formData = new FormData()
      formData.set('itemKey', item.id)
      formData.set('contextAt', coachHomeAttentionContextAt(item))
      await dismissCoachHomeAttentionItem(formData)
      router.refresh()
    })
  }

  function persistDismissMany(items: CoachHomeAttentionItem[]) {
    startDismiss(async () => {
      await dismissCoachHomeAttentionItems(
        items.map((item) => ({
          itemKey: item.id,
          contextAt: coachHomeAttentionContextAt(item),
        })),
      )
      router.refresh()
    })
  }

  function scheduleDismissMany(items: CoachHomeAttentionItem[]) {
    const pending = items.filter(
      (item) =>
        !handledIds.has(item.id) &&
        !exitingIds.has(item.id) &&
        !removedIds.has(item.id),
    )
    if (pending.length === 0) return

    const pendingIds = new Set(pending.map((item) => item.id))
    setSelectedAttentionId((current) =>
      current && pendingIds.has(current) ? null : current,
    )
    setHandledIds((current) => {
      const next = new Set(current)
      for (const id of pendingIds) next.add(id)
      return next
    })

    const exitTimer = window.setTimeout(() => {
      setHandledIds((current) => {
        const next = new Set(current)
        for (const id of pendingIds) next.delete(id)
        return next
      })
      setExitingIds((current) => {
        const next = new Set(current)
        for (const id of pendingIds) next.add(id)
        return next
      })

      const removeTimer = window.setTimeout(() => {
        setExitingIds((current) => {
          const next = new Set(current)
          for (const id of pendingIds) next.delete(id)
          return next
        })
        setRemovedIds((current) => {
          const next = new Set(current)
          for (const id of pendingIds) next.add(id)
          return next
        })
        if (pending.length === 1) {
          persistDismiss(pending[0])
        } else {
          persistDismissMany(pending)
        }
      }, EXIT_ANIMATION_MS)

      dismissTimers.current.push(removeTimer)
    }, HANDLED_FLASH_MS)

    dismissTimers.current.push(exitTimer)
  }

  function scheduleDismiss(item: CoachHomeAttentionItem) {
    scheduleDismissMany([item])
  }

  function handleSelectAttentionItem(item: CoachHomeAttentionItem) {
    setSelectedAttentionId((current) => (current === item.id ? null : item.id))
  }

  const showNeedsAttention = filteredAttention.length > 0

  if (totalAthletes === 0) {
    return (
      <div className="space-y-4 md:space-y-8">
        <CoachHomeMobileHero greeting={greeting} name={coachName} />
      <div className="tt-home-mobile-sheet space-y-4 md:contents md:space-y-0">
        <header className="hidden min-w-0 md:block">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
            Home
          </h1>
        </header>

        {coachingRequests.length > 0 ? (
          <CoachHomeCoachingRequests requests={coachingRequests} />
        ) : null}

        <CoachHomeEmptyState coachingCode={coachingCode} />
      </div>
      </div>
    )
  }

  return (
    <div className="space-y-0 md:space-y-8">
      <CoachHomeMobileHero greeting={greeting} name={coachName} />

      <div className="tt-home-mobile-sheet space-y-4 md:contents md:space-y-0">
        <header className="hidden min-w-0 md:block">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
            Home
          </h1>
        </header>

        <div className="grid gap-4 md:gap-8 xl:grid-cols-[3fr_2fr] xl:items-start">
          {showNeedsAttention ? (
            <CoachHomeNeedsAttentionSection
              className="order-3 md:order-none xl:col-start-1 xl:row-start-1"
              items={filteredAttention}
              selectedItemId={selectedAttentionId}
              handledIds={handledIds}
              exitingIds={exitingIds}
              onSelectItem={handleSelectAttentionItem}
              onDismissItem={scheduleDismiss}
              onDismissItems={scheduleDismissMany}
            />
          ) : null}
          <div className="order-1 space-y-4 md:order-none md:space-y-8 xl:col-start-2 xl:row-start-1 xl:row-span-2">
            <CoachHomeCoachingRequests requests={coachingRequests} />
            {selectedAttentionItem ? (
              <CoachHomeAttentionActionPanel
                item={selectedAttentionItem}
                onClose={() => setSelectedAttentionId(null)}
                onDismiss={() => scheduleDismiss(selectedAttentionItem)}
              />
            ) : (
              <CoachHomePlanningCoverage
                rows={planningCoverageRows}
                totalAthletes={planningCoverageRows.length}
                planningLeadDays={planningLeadDays}
                needsPlanCount={needsPlanCount}
              />
            )}
          </div>
          <CoachHomeRecentActivityTable
            className={cn(
              'order-2 md:order-none xl:col-start-1',
              showNeedsAttention ? 'xl:row-start-2' : 'xl:row-start-1',
            )}
            rows={activityRows}
            athleteOptions={athleteOptions}
          />
        </div>
      </div>
    </div>
  )
}
