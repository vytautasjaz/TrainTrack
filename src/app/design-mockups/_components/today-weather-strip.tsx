'use client'

import { WeatherGlyph } from '@/components/weather/weather-glyph'

type WeatherSlots = {
  morning: string
  day: string
  evening: string
  morningGlyph?: string
  dayGlyph?: string
  eveningGlyph?: string
}

const DEFAULT_GLYPHS = {
  morning: 'partly-cloudy-day',
  day: 'partly-cloudy-day',
  evening: 'partly-cloudy-night',
} as const

/** Home-style strip: Morning / Day / Evening with production WeatherGlyph */
export function TodayWeatherStrip({
  compact = false,
  morning = '24°',
  day = '25°',
  evening = '21°',
  morningGlyph = DEFAULT_GLYPHS.morning,
  dayGlyph = DEFAULT_GLYPHS.day,
  eveningGlyph = DEFAULT_GLYPHS.evening,
}: {
  compact?: boolean
} & Partial<WeatherSlots>) {
  const slots = [
    { label: 'Morning', temp: morning, glyph: morningGlyph },
    { label: 'Day', temp: day, glyph: dayGlyph },
    { label: 'Evening', temp: evening, glyph: eveningGlyph },
  ] as const

  return (
    <div
      className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2.5'}`}
      aria-label="Day weather"
    >
      {slots.map((slot, i) => (
        <div key={slot.label} className="flex items-center gap-1.5">
          {i > 0 ? (
            <span
              className={`${compact ? 'mx-0.5' : 'mx-1'} h-1 w-1 shrink-0 rounded-full bg-[var(--tt-line-strong)]`}
              aria-hidden
            />
          ) : null}
          <WeatherGlyph
            glyph={slot.glyph}
            tone="muted"
            className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}
          />
          <span
            className={`leading-none text-[var(--tt-ink-faint)] ${
              compact ? 'text-[9px]' : 'text-[11px]'
            }`}
          >
            <span className="font-normal">{slot.label}</span>{' '}
            <span className="font-medium tabular-nums text-[var(--tt-ink-soft)]">
              {slot.temp}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Compact: icon + temp | icon + temp | icon + temp (upcoming rows) */
export function DayWeatherMini({
  morning,
  day,
  evening,
  morningGlyph = DEFAULT_GLYPHS.morning,
  dayGlyph = DEFAULT_GLYPHS.day,
  eveningGlyph = DEFAULT_GLYPHS.evening,
}: WeatherSlots) {
  const slots = [
    { temp: morning, glyph: morningGlyph },
    { temp: day, glyph: dayGlyph },
    { temp: evening, glyph: eveningGlyph },
  ] as const

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 text-[10px] text-[var(--tt-ink-faint)]"
      aria-label={`Weather ${morning} ${day} ${evening}`}
    >
      {slots.map((slot, i) => (
        <div key={i} className="flex items-center gap-0.5">
          {i > 0 ? (
            <span className="mx-0.5 text-[var(--tt-line-strong)]" aria-hidden>
              |
            </span>
          ) : null}
          <WeatherGlyph glyph={slot.glyph} tone="muted" className="h-3.5 w-3.5" />
          <span className="font-medium tabular-nums text-[var(--tt-ink-soft)]">
            {slot.temp}
          </span>
        </div>
      ))}
    </div>
  )
}
