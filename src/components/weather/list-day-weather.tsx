'use client'

import { WeatherGlyph } from '@/components/weather/weather-glyph'
import {
  formatWeatherPrecip,
  type WeatherDaySummary,
  type WeatherSlotSummary,
} from '@/lib/weather/places'
import { cn } from '@/lib/utils'

function slotTemp(slot: WeatherSlotSummary): string {
  return slot.temperatureC != null ? `${slot.temperatureC}°` : '—'
}

function hasSlotData(slot: WeatherSlotSummary): boolean {
  return (
    slot.temperatureC != null || Boolean(formatWeatherPrecip(slot))
  )
}

/** Home/list today strip: Morning / Day / Evening with glyphs (matches design mock). */
export function ListDayWeatherStrip({
  weather,
  compact = false,
  size = 'md',
  className,
}: {
  weather: WeatherDaySummary
  compact?: boolean
  /** Home header uses `lg` for larger icons. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const slots = weather.slots.filter(hasSlotData)
  if (slots.length === 0) return null

  const resolvedSize = compact && size === 'md' ? 'sm' : size
  const glyphClass =
    resolvedSize === 'lg'
      ? 'h-9 w-9'
      : resolvedSize === 'sm'
        ? 'h-6 w-6'
        : 'h-7 w-7'
  const textClass =
    resolvedSize === 'lg'
      ? 'text-[12px]'
      : resolvedSize === 'sm'
        ? 'text-[9px]'
        : 'text-[11px]'
  const gapClass =
    resolvedSize === 'lg' ? 'gap-3' : resolvedSize === 'sm' ? 'gap-1.5' : 'gap-2.5'

  return (
    <div
      className={cn('flex flex-nowrap items-center', gapClass, className)}
      aria-label="Day weather"
    >
      {slots.map((slot, i) => (
        <div key={slot.label} className="flex items-center gap-1.5">
          {i > 0 ? (
            <span
              className={cn(
                'h-1 w-1 shrink-0 rounded-full bg-[var(--tt-line-strong,#ddd)]',
                resolvedSize === 'lg' ? 'mx-1' : resolvedSize === 'sm' ? 'mx-0.5' : 'mx-1',
              )}
              aria-hidden
            />
          ) : null}
          <WeatherGlyph
            glyph={slot.emoji}
            tone="muted"
            className={glyphClass}
          />
          <span
            className={cn(
              'leading-none text-[var(--tt-ink-faint,#9a9a9a)]',
              textClass,
            )}
          >
            <span className="font-normal">{slot.label}</span>{' '}
            <span className="font-medium tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
              {slotTemp(slot)}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Compact upcoming-day weather: icon+temp | icon+temp | icon+temp */
export function ListDayWeatherMini({
  weather,
  className,
}: {
  weather: WeatherDaySummary
  className?: string
}) {
  const slots = weather.slots.filter(hasSlotData)
  if (slots.length === 0) return null

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 text-[10px] text-[var(--tt-ink-faint,#9a9a9a)]',
        className,
      )}
      aria-label={slots.map((s) => `${s.label} ${slotTemp(s)}`).join(' ')}
    >
      {slots.map((slot, i) => (
        <div key={slot.label} className="flex items-center gap-0.5">
          {i > 0 ? (
            <span className="mx-0.5 text-[var(--tt-line-strong,#ddd)]" aria-hidden>
              |
            </span>
          ) : null}
          <WeatherGlyph
            glyph={slot.emoji}
            tone="muted"
            className="h-6 w-6"
          />
          <span className="font-medium tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
            {slotTemp(slot)}
          </span>
        </div>
      ))}
    </div>
  )
}
