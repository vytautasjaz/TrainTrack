'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { WorkoutType } from '@prisma/client'
import { Flag } from 'lucide-react'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { SPORT_ROW_ORDER, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const ADD_SPORTS = SPORT_ROW_ORDER.filter(
  (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
)

/** When the plan has no sport focus, show these on hover. */
const MIXED_PRIMARY_SPORTS: WorkoutType[] = [
  WorkoutType.SWIM,
  WorkoutType.BIKE,
  WorkoutType.RUN,
  WorkoutType.STRENGTH,
]

const TRIATHLON_PRIMARY_SPORTS: WorkoutType[] = [
  WorkoutType.SWIM,
  WorkoutType.BIKE,
  WorkoutType.RUN,
]

/** Hover chips for a plan’s sport focus (triathlon → swim/bike/run). */
function primarySportsForPlanFocus(
  focus: WorkoutType | null,
): WorkoutType[] {
  if (!focus || focus === WorkoutType.REST || focus === WorkoutType.RECOVERY) {
    return MIXED_PRIMARY_SPORTS
  }
  if (focus === WorkoutType.TRIATHLON) return TRIATHLON_PRIMARY_SPORTS
  if (ADD_SPORTS.includes(focus)) return [focus]
  return MIXED_PRIMARY_SPORTS
}

function isHighlightedAddSport(
  sport: WorkoutType,
  focus: WorkoutType | null,
): boolean {
  if (!focus) return false
  if (focus === WorkoutType.TRIATHLON) {
    return TRIATHLON_PRIMARY_SPORTS.includes(sport)
  }
  return sport === focus
}

const chipClass = cn(
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px]',
  'border border-[var(--tt-line-strong,#d4d4d4)] bg-white/95 text-[var(--tt-ink-soft,#6b6b6b)] shadow-sm',
  'transition hover:border-foreground/30 hover:bg-white hover:text-foreground',
)

type PlanCanvasDayAddMenuProps = {
  onPickSport: (sport: WorkoutType) => void
  onAddRace?: () => void
  /**
   * Plan sport focus — hover shows that sport (+ …).
   * Triathlon expands to swim / bike / run. Without focus, shows
   * swim/bike/run/strength. Race is under … only.
   */
  defaultSport?: WorkoutType | null
  className?: string
}

/**
 * Hover sport chips centered in the cell’s remaining empty space
 * (below workout cards), not overlaid on them. Race lives under ….
 */
export function PlanCanvasDayAddMenu({
  onPickSport,
  onAddRace,
  defaultSport = null,
  className,
}: PlanCanvasDayAddMenuProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const primarySports = useMemo(
    () => primarySportsForPlanFocus(defaultSport),
    [defaultSport],
  )

  useLayoutEffect(() => {
    if (!moreOpen || !moreBtnRef.current) {
      setPos(null)
      return
    }
    const rect = moreBtnRef.current.getBoundingClientRect()
    const menuW = 192
    const pad = 8
    const spaceBelow = window.innerHeight - rect.bottom - pad
    const top =
      spaceBelow < 200 && rect.top > 200
        ? Math.max(pad, rect.top - 220)
        : Math.min(window.innerHeight - pad - 40, rect.bottom + 4)
    setPos({
      left: Math.min(
        Math.max(pad, rect.left + rect.width / 2 - menuW / 2),
        window.innerWidth - menuW - pad,
      ),
      top,
    })
  }, [moreOpen])

  useEffect(() => {
    if (!moreOpen) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (moreBtnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [moreOpen])

  return (
    <>
      <div
        className={cn(
          'pointer-events-none relative z-[1] flex min-h-[1.75rem] flex-1 flex-wrap items-center justify-center gap-0.5',
          'opacity-0 transition-opacity',
          'group-hover/day:opacity-100',
          'group-focus-within/day:opacity-100',
          moreOpen && 'opacity-100',
          '[@media(hover:none)]:opacity-70',
          className,
        )}
      >
        {primarySports.map((sport) => (
          <button
            key={sport}
            type="button"
            aria-label={`Add ${WORKOUT_TYPE_LABELS[sport]}`}
            title={WORKOUT_TYPE_LABELS[sport]}
            className={cn(
              chipClass,
              'pointer-events-auto',
              isHighlightedAddSport(sport, defaultSport) &&
                'border-foreground/35 ring-1 ring-foreground/15',
            )}
            onClick={(e) => {
              e.stopPropagation()
              setMoreOpen(false)
              onPickSport(sport)
            }}
          >
            <WorkoutSportIcon
              type={sport}
              size="xs"
              className="!h-3 !w-3 !rounded-sm"
            />
          </button>
        ))}
        <button
          ref={moreBtnRef}
          type="button"
          aria-label="More add options"
          aria-expanded={moreOpen}
          title="More…"
          className={cn(
            chipClass,
            'pointer-events-auto text-[11px] font-bold tracking-tight',
            moreOpen && 'border-foreground/35 ring-1 ring-foreground/15',
          )}
          onClick={(e) => {
            e.stopPropagation()
            setMoreOpen((v) => !v)
          }}
        >
          …
        </button>
      </div>
      {moreOpen && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="More add options"
              className="fixed z-[80] max-h-[min(16rem,50vh)] w-48 overflow-y-auto rounded-[8px] border border-[var(--tt-line-strong,#d4d4d4)] bg-white py-1 shadow-lg"
              style={{ left: pos.left, top: pos.top }}
            >
              {ADD_SPORTS.filter((sport) => sport !== WorkoutType.TRIATHLON).map(
                (sport) => (
                <button
                  key={sport}
                  type="button"
                  role="menuitem"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                    isHighlightedAddSport(sport, defaultSport) &&
                      'font-semibold',
                  )}
                  onClick={() => {
                    setMoreOpen(false)
                    onPickSport(sport)
                  }}
                >
                  <WorkoutSportIcon
                    type={sport}
                    size="xs"
                    className="!h-3.5 !w-3.5 !rounded-sm"
                  />
                  {WORKOUT_TYPE_LABELS[sport]}
                </button>
              ),
              )}
              {onAddRace ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2 text-left text-sm font-medium hover:bg-[var(--tt-sidebar,#f5f5f5)]"
                  onClick={() => {
                    setMoreOpen(false)
                    onAddRace()
                  }}
                >
                  <Flag
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    strokeWidth={2}
                  />
                  Race
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
