'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ATHLETE_HOME_RACES } from './athlete-home-mock-data'

function formatCountdown(days: number) {
  const dayLabel = days === 1 ? 'Day to go' : 'Days to go'
  if (days < 7) {
    return { primary: String(days), label: dayLabel, weeks: null as string | null }
  }
  const weeks = Math.floor(days / 7)
  return {
    primary: String(days),
    label: dayLabel,
    weeks: weeks === 1 ? '≈ 1 week' : `≈ ${weeks} weeks`,
  }
}

export function NextRacesMock({ compact = false }: { compact?: boolean }) {
  const races = ATHLETE_HOME_RACES
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  function go(dir: -1 | 1) {
    const el = scrollerRef.current
    if (!el) return
    const next = Math.min(races.length - 1, Math.max(0, active + dir))
    const slide = el.children[next] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    setActive(next)
  }

  function onScroll() {
    const el = scrollerRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setActive(Math.min(races.length - 1, Math.max(0, i)))
  }

  return (
    <div className={`tt-mock-card overflow-hidden ${compact ? 'p-3.5' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="tt-mock-overline">Upcoming races</p>
          <p className="mt-0.5 text-[10px] text-[var(--tt-ink-faint)]">
            {active + 1} of {races.length}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="rounded p-0.5 text-[var(--tt-ink-faint)] enabled:hover:text-[var(--tt-ink)] disabled:opacity-30"
            aria-label="Previous race"
            onClick={() => go(-1)}
            disabled={active <= 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="rounded p-0.5 text-[var(--tt-ink-faint)] enabled:hover:text-[var(--tt-ink)] disabled:opacity-30"
            aria-label="Next race"
            onClick={() => go(1)}
            disabled={active >= races.length - 1}
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="mt-3 flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {races.map((race) => {
          const countdown = formatCountdown(race.days)
          return (
            <div
              key={race.date}
              className="w-full min-w-full shrink-0 snap-start snap-always"
            >
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`tt-mock-stat ${
                      compact ? 'text-[1.55rem]' : 'text-[1.9rem]'
                    }`}
                  >
                    <span className="text-[var(--tt-ink)]">{race.nameLead} </span>
                    <span className="text-[var(--tt-red)]">{race.nameAccent}</span>
                  </p>
                  <p className="tt-mock-caption mt-1.5">{race.date}</p>
                  <p className="tt-mock-caption text-[var(--tt-ink-faint)]">{race.place}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`tt-mock-stat leading-none ${compact ? 'text-4xl' : 'text-5xl'}`}>
                    {countdown.primary}
                  </p>
                  <p className="tt-mock-overline mt-1 text-[var(--tt-red)]">
                    {countdown.label}
                  </p>
                  {countdown.weeks ? (
                    <p className="mt-0.5 text-[10px] text-[var(--tt-ink-faint)]">
                      {countdown.weeks}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {races.map((race, i) => (
          <button
            key={race.date}
            type="button"
            aria-label={`Show ${race.nameLead} ${race.nameAccent}`}
            aria-current={i === active}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === active ? '1rem' : '0.35rem',
              background: i === active ? 'var(--tt-red)' : 'var(--tt-line-strong)',
            }}
            onClick={() => {
              const el = scrollerRef.current
              const slide = el?.children[i] as HTMLElement | undefined
              slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
              setActive(i)
            }}
          />
        ))}
      </div>
    </div>
  )
}
