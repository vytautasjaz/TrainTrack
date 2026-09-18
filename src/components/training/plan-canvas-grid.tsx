'use client'

import { useMemo, useState } from 'react'
import type { WorkoutType } from '@prisma/client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  DAY_OF_WEEK_SHORT,
  planDayCount,
  planDayIndex,
  planSlotKey,
  phaseForDay,
  phaseForWeek,
  resolvePlanPhaseColor,
  type TrainingPlanEditorDetail,
  type TrainingPlanPhaseDetail,
  type TrainingPlanRacePlaceholderDetail,
  type TrainingPlanSessionDetail,
} from '@/lib/training-plan'
import { planSessionToPlanWorkoutDetail } from '@/lib/training-plan-session-map'
import {
  TABLE_BODY,
  TABLE_HEADER,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_MUTED,
  TABLE_HEADER_CELL_STRONG,
  TABLE_HEADER_CELL_WEEKEND,
  TABLE_HEADER_VLINE,
  TABLE_SHELL,
} from '@/lib/table-styles'
import { cn } from '@/lib/utils'
import { PlanDayDropSection } from '@/components/training/plan-day-drop-section'
import { PlanCanvasSessionCard } from '@/components/training/plan-canvas-session-card'
import { PlanCanvasRaceCard } from '@/components/training/plan-canvas-race-card'
import {
  PlanCanvasDayStack,
  type PlanCanvasStackItem,
} from '@/components/training/plan-canvas-day-stack'
import { PlanCanvasWeekStats } from '@/components/training/plan-canvas-week-stats'
import { PlanCanvasDayAddMenu } from '@/components/training/plan-canvas-day-add-menu'
import { PlanSessionEditorDialog } from '@/components/training/plan-session-editor-dialog'
import { PlanRacePlaceholderModal } from '@/components/training/plan-race-placeholder-modal'
import { useOptionalWeekCardSize } from '@/components/plan/week-card-size-context'
import { useStoredFlag } from '@/hooks/use-stored-flag'
import { PLAN_CANVAS_STATS_COLLAPSED_STORAGE_KEY } from '@/lib/plan-calendar-layers'
import type { AthletePreferences } from '@/lib/athlete-preferences'

const STATS_COL_EXPANDED = 'minmax(11rem, 14rem)'
const STATS_COL_COMPACT = 'minmax(3.25rem, 3.75rem)'
const DAY_COLS = 'repeat(7, minmax(6.5rem, 1fr))'
const STATS_COL_MOTION =
  'grid-template-columns var(--tt-motion-normal, 280ms) cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * Outline edges for a day that sits in a phase. Neighbor outside the same phase
 * (or missing) → draw that edge. At a phase|phase join in the same week, only the
 * new phase draws the shared vertical (left). Across weeks, only the lower cell
 * draws the shared horizontal (top) so lines never stack.
 */
function phaseOutlineEdges(
  phases: TrainingPlanPhaseDetail[],
  day: number,
  dayCount: number,
): { top: boolean; bottom: boolean; left: boolean; right: boolean } {
  const cur = phaseForDay(phases, day)
  if (!cur) return { top: false, bottom: false, left: false, right: false }

  const dow = day % 7
  const prev = day > 0 ? phaseForDay(phases, day - 1) : null
  const next = day + 1 < dayCount ? phaseForDay(phases, day + 1) : null
  const above = day >= 7 ? phaseForDay(phases, day - 7) : null
  const below = day + 7 < dayCount ? phaseForDay(phases, day + 7) : null

  // Skip Monday left / Sunday right — those are the day-grid table edges.
  const left = dow > 0 && (!prev || prev.id !== cur.id)
  // Same-week phase join: leave the line to the next cell's left edge.
  const right = dow < 6 && !next
  const top = !above || above.id !== cur.id
  // Week join with another phase below: leave the line to that cell's top.
  const bottom = !below

  return { top, bottom, left, right }
}

type EditorState =
  | {
      weekIndex: number
      dayOfWeek: number
      sport: WorkoutType
      session: TrainingPlanSessionDetail | null
    }
  | null

type RaceEditorState =
  | {
      weekIndex: number
      dayOfWeek: number
      race: TrainingPlanRacePlaceholderDetail | null
    }
  | null

type PlanCanvasGridProps = {
  plan: TrainingPlanEditorDetail
  estimationPreferences?: AthletePreferences | null
}

export function PlanCanvasGrid({
  plan,
  estimationPreferences = null,
}: PlanCanvasGridProps) {
  const cardSize = useOptionalWeekCardSize()?.cardSize ?? 'l'
  const [editor, setEditor] = useState<EditorState>(null)
  const [raceEditor, setRaceEditor] = useState<RaceEditorState>(null)
  const [statsCollapsed, setStatsCollapsed] = useStoredFlag(
    PLAN_CANVAS_STATS_COLLAPSED_STORAGE_KEY,
    false,
  )

  function toggleStatsCollapsed() {
    setStatsCollapsed((prev) => !prev)
  }

  const gridTemplateColumns = `${
    statsCollapsed ? STATS_COL_COMPACT : STATS_COL_EXPANDED
  } ${DAY_COLS}`

  const sessionsBySlot = useMemo(() => {
    const map = new Map<string, TrainingPlanSessionDetail[]>()
    for (const s of plan.sessions) {
      const key = planSlotKey(s.weekIndex, s.dayOfWeek)
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return map
  }, [plan.sessions])

  const racesBySlot = useMemo(() => {
    const map = new Map<string, TrainingPlanRacePlaceholderDetail[]>()
    for (const r of plan.races) {
      const key = planSlotKey(r.weekIndex, r.dayOfWeek)
      const list = map.get(key) ?? []
      list.push(r)
      map.set(key, list)
    }
    return map
  }, [plan.races])

  const itemsBySlot = useMemo(() => {
    const map = new Map<string, PlanCanvasStackItem[]>()
    const keys = new Set([
      ...sessionsBySlot.keys(),
      ...racesBySlot.keys(),
    ])
    for (const key of keys) {
      const sessions = sessionsBySlot.get(key) ?? []
      const races = racesBySlot.get(key) ?? []
      const items: PlanCanvasStackItem[] = [
        ...sessions.map((s) => ({
          kind: 'session' as const,
          id: s.id,
          sortOrder: s.sortOrder,
          title: s.title,
        })),
        ...races.map((r) => ({
          kind: 'race' as const,
          id: r.id,
          sortOrder: r.sortOrder,
          title: r.name,
        })),
      ].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
      )
      map.set(key, items)
    }
    return map
  }, [sessionsBySlot, racesBySlot])

  const occupiedSlots = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const [key, sessions] of sessionsBySlot) {
      counts[key] = sessions.length
    }
    return counts
  }, [sessionsBySlot])

  const sessionsByWeek = useMemo(() => {
    const map = new Map<number, TrainingPlanSessionDetail[]>()
    for (const s of plan.sessions) {
      const list = map.get(s.weekIndex) ?? []
      list.push(s)
      map.set(s.weekIndex, list)
    }
    return map
  }, [plan.sessions])

  const weeks = Array.from({ length: plan.weekCount }, (_, i) => i)

  return (
    <>
      <div
        className={cn('overflow-x-auto', TABLE_SHELL)}
        data-card-size={cardSize}
      >
        <div className="min-w-[52rem]">
          <div
            className={cn('tt-month-grid-days-header grid', TABLE_HEADER)}
            style={{
              gridTemplateColumns,
              transition: STATS_COL_MOTION,
            }}
          >
            <button
              type="button"
              onClick={toggleStatsCollapsed}
              title={
                statsCollapsed
                  ? 'Expand stats column'
                  : 'Minimize stats column'
              }
              aria-pressed={statsCollapsed}
              className={cn(
                'flex items-center gap-1 overflow-hidden px-2 py-2 text-[11px] font-semibold transition-[padding,justify-content] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-110',
                TABLE_HEADER_VLINE,
                TABLE_HEADER_CELL_MUTED,
                statsCollapsed && 'justify-center px-1',
              )}
            >
              {statsCollapsed ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <ChevronLeft
                  className="h-3.5 w-3.5 shrink-0"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)]',
                  statsCollapsed
                    ? 'max-w-0 opacity-0'
                    : 'max-w-[4rem] opacity-100',
                )}
              >
                Stats
              </span>
            </button>
            {DAY_OF_WEEK_SHORT.map((name, i) => (
              <div
                key={name}
                className={cn(
                  'flex items-center justify-center px-1 py-2 text-center text-[11px] font-semibold',
                  i < 6 && TABLE_HEADER_VLINE,
                  i >= 5 && TABLE_HEADER_CELL_WEEKEND,
                  i >= 5 ? TABLE_HEADER_CELL : TABLE_HEADER_CELL_STRONG,
                )}
              >
                {name}
              </div>
            ))}
          </div>

          <div
            className={cn(
              'grid gap-px bg-[color-mix(in_srgb,var(--tt-ink,#111)_12%,var(--tt-line,#ebebeb))]',
              TABLE_BODY,
            )}
            style={{
              gridTemplateColumns,
              transition: STATS_COL_MOTION,
            }}
          >
            {weeks.map((weekIndex) => {
              const phase = phaseForWeek(plan.phases, weekIndex)
              const dayCount = planDayCount(plan.weekCount)
              const mondayDay = planDayIndex(weekIndex, 0)
              const mondayEdge = phaseOutlineEdges(
                plan.phases,
                mondayDay,
                dayCount,
              )
              const statsPhaseRing = [
                mondayEdge.top
                  ? 'inset 0 2px 0 0 var(--tt-ink, #111)'
                  : null,
                mondayEdge.bottom
                  ? 'inset 0 -2px 0 0 var(--tt-ink, #111)'
                  : null,
              ]
                .filter(Boolean)
                .join(', ')

              return (
                <div key={weekIndex} className="contents">
                  <PlanCanvasWeekStats
                    planId={plan.id}
                    weekIndex={weekIndex}
                    sessions={sessionsByWeek.get(weekIndex) ?? []}
                    phase={phase}
                    sportFocus={plan.sportFocus}
                    estimationPreferences={estimationPreferences}
                    compact={statsCollapsed}
                    style={
                      statsPhaseRing ? { boxShadow: statsPhaseRing } : undefined
                    }
                  />
                  {DAY_OF_WEEK_SHORT.map((_, dayOfWeek) => {
                    const slotKey = planSlotKey(weekIndex, dayOfWeek)
                    const sessions = sessionsBySlot.get(slotKey) ?? []
                    const races = racesBySlot.get(slotKey) ?? []
                    const sessionById = new Map(sessions.map((s) => [s.id, s]))
                    const raceById = new Map(races.map((r) => [r.id, r]))
                    const dayItems = itemsBySlot.get(slotKey) ?? []
                    const isWeekend = dayOfWeek >= 5
                    const hasContent = dayItems.length > 0
                    const day = planDayIndex(weekIndex, dayOfWeek)
                    const dayPhase = phaseForDay(plan.phases, day)
                    const dayColor = dayPhase
                      ? resolvePlanPhaseColor(dayPhase.phase, dayPhase.color)
                      : null
                    const phaseWash = dayColor
                      ? `linear-gradient(color-mix(in srgb, ${dayColor} 8%, white), color-mix(in srgb, ${dayColor} 8%, white))`
                      : undefined
                    const edge = phaseOutlineEdges(plan.phases, day, dayCount)
                    const phaseRing = [
                      edge.top
                        ? 'inset 0 2px 0 0 var(--tt-ink, #111)'
                        : null,
                      edge.bottom
                        ? 'inset 0 -2px 0 0 var(--tt-ink, #111)'
                        : null,
                      edge.left
                        ? 'inset 2px 0 0 0 var(--tt-ink, #111)'
                        : null,
                      edge.right
                        ? 'inset -2px 0 0 0 var(--tt-ink, #111)'
                        : null,
                    ]
                      .filter(Boolean)
                      .join(', ')
                    return (
                      <PlanDayDropSection
                        key={slotKey}
                        slotKey={slotKey}
                        className={cn(
                          'group/day relative flex min-h-[7.5rem] flex-col gap-1.5 p-1.5 transition-[background-color]',
                          'after:pointer-events-none after:absolute after:inset-0 after:z-0 after:bg-transparent after:transition-colors',
                          'hover:after:bg-[color-mix(in_srgb,#111_4%,transparent)]',
                          isWeekend
                            ? 'bg-[color-mix(in_oklab,var(--color-muted)_28%,var(--color-card))]'
                            : 'bg-card',
                        )}
                        style={{
                          ...(phaseWash
                            ? { backgroundImage: phaseWash }
                            : null),
                          ...(phaseRing ? { boxShadow: phaseRing } : null),
                        }}
                      >
                        {hasContent ? (
                          <div className="relative z-[1] w-full shrink-0">
                            <PlanCanvasDayStack
                              planId={plan.id}
                              slotKey={slotKey}
                              items={dayItems}
                              className="!flex-none"
                              renderItem={(item, meta) => {
                                if (item.kind === 'race') {
                                  const race = raceById.get(item.id)
                                  if (!race) return null
                                  return (
                                    <div
                                      className={cn(
                                        meta.isDragging && 'opacity-40',
                                      )}
                                    >
                                      <PlanCanvasRaceCard
                                        race={race}
                                        slotKey={slotKey}
                                        onEdit={(next) =>
                                          setRaceEditor({
                                            weekIndex: next.weekIndex,
                                            dayOfWeek: next.dayOfWeek,
                                            race: next,
                                          })
                                        }
                                      />
                                    </div>
                                  )
                                }
                                const session = sessionById.get(item.id)
                                if (!session) return null
                                return (
                                  <div
                                    className={cn(
                                      meta.isDragging && 'opacity-40',
                                    )}
                                  >
                                    <PlanCanvasSessionCard
                                      session={session}
                                      slotKey={slotKey}
                                      weekCount={plan.weekCount}
                                      occupiedSlots={occupiedSlots}
                                      onEdit={(next) =>
                                        setEditor({
                                          weekIndex: next.weekIndex,
                                          dayOfWeek: next.dayOfWeek,
                                          sport: next.type,
                                          session: next,
                                        })
                                      }
                                    />
                                  </div>
                                )
                              }}
                            />
                          </div>
                        ) : null}
                        <PlanCanvasDayAddMenu
                          defaultSport={plan.sportFocus}
                          onPickSport={(sport) =>
                            setEditor({
                              weekIndex,
                              dayOfWeek,
                              sport,
                              session: null,
                            })
                          }
                          onAddRace={() =>
                            setRaceEditor({
                              weekIndex,
                              dayOfWeek,
                              race: null,
                            })
                          }
                        />
                      </PlanDayDropSection>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {editor ? (
        <PlanSessionEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditor(null)
          }}
          planId={plan.id}
          weekIndex={editor.weekIndex}
          dayOfWeek={editor.dayOfWeek}
          sport={editor.sport}
          session={
            editor.session
              ? planSessionToPlanWorkoutDetail(editor.session)
              : null
          }
          athletePreferences={estimationPreferences}
        />
      ) : null}

      {raceEditor ? (
        <PlanRacePlaceholderModal
          key={raceEditor.race?.id ?? `new-${raceEditor.weekIndex}-${raceEditor.dayOfWeek}`}
          open
          onOpenChange={(open) => {
            if (!open) setRaceEditor(null)
          }}
          planId={plan.id}
          weekIndex={raceEditor.weekIndex}
          dayOfWeek={raceEditor.dayOfWeek}
          race={raceEditor.race}
        />
      ) : null}
    </>
  )
}
