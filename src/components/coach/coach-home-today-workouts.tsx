'use client'

import { useMemo, useState } from 'react'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { TrainingWorkoutCard } from '@/components/training/training-workout-card'
import { type CoachHomeTodayAthlete } from '@/lib/coach-roster'
import { cn } from '@/lib/utils'

type CoachHomeTodayWorkoutsProps = {
  athletes: CoachHomeTodayAthlete[]
}

export function CoachHomeTodayWorkouts({ athletes }: CoachHomeTodayWorkoutsProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('all')

  const athletesWithWorkouts = useMemo(
    () => athletes.filter((athlete) => athlete.workouts.length > 0),
    [athletes],
  )

  const visibleAthletes = useMemo(() => {
    if (selectedAthleteId === 'all') {
      return athletesWithWorkouts.length > 0 ? athletesWithWorkouts : athletes
    }
    return athletes.filter((athlete) => athlete.athleteId === selectedAthleteId)
  }, [athletes, athletesWithWorkouts, selectedAthleteId])

  const totalWorkouts = athletes.reduce((sum, athlete) => sum + athlete.workouts.length, 0)

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-soft)]">
            Today
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--tt-ink-faint)]">
            {totalWorkouts} workout{totalWorkouts === 1 ? '' : 's'} across {athletes.length} active
            athletes
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          active={selectedAthleteId === 'all'}
          onClick={() => setSelectedAthleteId('all')}
          label="All athletes"
        />
        {athletes.map((athlete) => (
          <FilterChip
            key={athlete.athleteId}
            active={selectedAthleteId === athlete.athleteId}
            onClick={() => setSelectedAthleteId(athlete.athleteId)}
            label={athlete.athleteName.split(/\s+/)[0] ?? athlete.athleteName}
            count={athlete.workouts.length > 0 ? athlete.workouts.length : undefined}
          />
        ))}
      </div>

      <div className="space-y-4">
        {visibleAthletes.length === 0 ? (
          <p className="text-[13px] text-[var(--tt-ink-faint)]">No active athletes.</p>
        ) : (
          visibleAthletes.map((athlete) => (
            <div key={athlete.athleteId} className="min-w-0">
              {selectedAthleteId === 'all' ? (
                <div className="mb-2 flex items-center gap-2">
                  <AthleteAvatar
                    name={athlete.athleteName}
                    avatarUrl={athlete.avatarUrl}
                    size="sm"
                  />
                  <p className="text-[13px] font-semibold text-[var(--tt-ink)]">{athlete.athleteName}</p>
                </div>
              ) : null}
              {athlete.workouts.length === 0 ? (
                <p className="text-[13px] text-[var(--tt-ink-faint)]">Nothing scheduled today.</p>
              ) : (
                <ul className="space-y-2">
                  {athlete.workouts.map((workout) => (
                    <li key={workout.id}>
                      <TrainingWorkoutCard workout={workout} isCoach compact />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-active={active ? 'true' : 'false'}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[12px] font-semibold transition',
        active
          ? 'border-[var(--tt-line-strong,#ddd)] bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink)]'
          : 'border-[var(--tt-line)] bg-white text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]',
      )}
      onClick={onClick}
    >
      {label}
      {count != null && count > 0 ? (
        <span className="ml-1 tabular-nums text-[var(--tt-ink-faint)]">{count}</span>
      ) : null}
    </button>
  )
}
