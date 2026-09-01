'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronDown } from 'lucide-react'
import {
  dismissCoachHomeAttentionItem,
  dismissCoachHomeAttentionItems,
} from '@/app/actions/coach-home'
import { CoachHomeAttentionActionPanel } from '@/components/coach/coach-home-attention-action-panel'
import { CoachHomeCoachingRequests } from '@/components/coach/coach-home-coaching-requests'
import type { CoachHomeCoachingRequest } from '@/components/coach/coach-home-coaching-requests'
import { CoachHomeNeedsAttentionSection } from '@/components/coach/coach-home-needs-attention-section'
import { CoachHomePlanningCoverage } from '@/components/coach/coach-home-planning-coverage'
import { CoachHomeRecentActivityTable } from '@/components/coach/coach-home-recent-activity-table'
import {
  CoachHomeActivityTableRow,
  CoachHomeAttentionItem,
  CoachHomePlanningCoverageRow,
  CoachHomeTimeRange,
  coachHomeAttentionContextAt,
} from '@/lib/coach-home'
import { filterActivityByTimeRange } from '@/lib/coach-home'
import { cn } from '@/lib/utils'

const HANDLED_FLASH_MS = 420
const EXIT_ANIMATION_MS = 240

type CoachHomeClientProps = {
  attentionItems: CoachHomeAttentionItem[]
  coachingRequests: CoachHomeCoachingRequest[]
  planningCoverageRows: CoachHomePlanningCoverageRow[]
  needsPlanCount: number
  planningLeadDays: number
  activityRows: CoachHomeActivityTableRow[]
  athleteOptions: Array<{ id: string; name: string }>
  totalAthletes: number
}

export function CoachHomeClient({
  attentionItems,
  coachingRequests,
  planningCoverageRows,
  needsPlanCount,
  planningLeadDays,
  activityRows,
  athleteOptions,
  totalAthletes,
}: CoachHomeClientProps) {
  const router = useRouter()
  const [, startDismiss] = useTransition()
  const dismissTimers = useRef<number[]>([])
  const [athleteId, setAthleteId] = useState('all')
  const [timeRange, setTimeRange] = useState<CoachHomeTimeRange>('last_7d')
  const [selectedAttentionId, setSelectedAttentionId] = useState<string | null>(null)
  const [handledIds, setHandledIds] = useState<Set<string>>(() => new Set())
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set())
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set())

  const filteredAttention = useMemo(() => {
    const base =
      athleteId === 'all'
        ? attentionItems
        : attentionItems.filter((item) => item.athleteId === athleteId)
    return base.filter((item) => !removedIds.has(item.id))
  }, [attentionItems, athleteId, removedIds])

  const filteredCoachingRequests = useMemo(() => {
    if (athleteId === 'all') return coachingRequests
    return coachingRequests.filter((request) => request.athlete.id === athleteId)
  }, [coachingRequests, athleteId])

  const filteredPlanningCoverage = useMemo(() => {
    if (athleteId === 'all') return planningCoverageRows
    return planningCoverageRows.filter((row) => row.athleteId === athleteId)
  }, [planningCoverageRows, athleteId])

  const filteredActivity = useMemo(() => {
    let rows = filterActivityByTimeRange(activityRows, timeRange)
    if (athleteId !== 'all') {
      rows = rows.filter((row) => row.athleteId === athleteId)
    }
    return rows
  }, [activityRows, athleteId, timeRange])

  const filteredNeedsPlanCount = useMemo(() => {
    if (athleteId === 'all') return needsPlanCount
    return filteredPlanningCoverage.some((row) => row.daysUnplanned > 0) ? 1 : 0
  }, [athleteId, needsPlanCount, filteredPlanningCoverage])

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
    setSelectedAttentionId(null)
  }, [athleteId])

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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
            Home
          </h1>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <HomeSelect
            value={athleteId}
            onChange={setAthleteId}
            options={[
              { value: 'all', label: 'All athletes' },
              ...athleteOptions.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <HomeSelect
            value={timeRange}
            onChange={(value) => setTimeRange(value as CoachHomeTimeRange)}
            options={[
              { value: 'last_7d', label: 'Last 7 days' },
              { value: 'this_week', label: 'This week' },
              { value: 'last_30d', label: 'Last 30 days' },
              { value: 'all_time', label: 'All time' },
            ]}
            icon={<CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
          />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[3fr_2fr] xl:items-start">
        <CoachHomeNeedsAttentionSection
          items={filteredAttention}
          selectedItemId={selectedAttentionId}
          handledIds={handledIds}
          exitingIds={exitingIds}
          onSelectItem={handleSelectAttentionItem}
          onDismissItem={scheduleDismiss}
          onDismissItems={scheduleDismissMany}
        />
        <div className="space-y-8">
          <CoachHomeCoachingRequests requests={filteredCoachingRequests} />
          {selectedAttentionItem ? (
            <CoachHomeAttentionActionPanel
              item={selectedAttentionItem}
              onClose={() => setSelectedAttentionId(null)}
              onDismiss={() => scheduleDismiss(selectedAttentionItem)}
            />
          ) : (
            <CoachHomePlanningCoverage
              rows={filteredPlanningCoverage}
              totalAthletes={
                athleteId === 'all'
                  ? totalAthletes
                  : filteredPlanningCoverage.length > 0
                    ? 1
                    : 0
              }
              planningLeadDays={planningLeadDays}
              needsPlanCount={filteredNeedsPlanCount}
            />
          )}
        </div>
      </div>

      <CoachHomeRecentActivityTable rows={filteredActivity} />
    </div>
  )
}

function HomeSelect({
  value,
  onChange,
  options,
  icon,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  icon?: React.ReactNode
}) {
  return (
    <label className="relative inline-flex min-w-[8.5rem] items-center">
      {icon ? (
        <span className="pointer-events-none absolute left-2.5 text-[var(--tt-ink-faint)]">
          {icon}
        </span>
      ) : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full appearance-none rounded-full border border-[var(--tt-line)] bg-white py-1.5 pr-8 text-[12px] font-semibold text-[var(--tt-ink)] outline-none hover:border-[var(--tt-line-strong,#ddd)]',
          icon ? 'pl-8' : 'pl-3',
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[var(--tt-ink-faint)]"
        strokeWidth={1.75}
        aria-hidden
      />
    </label>
  )
}
