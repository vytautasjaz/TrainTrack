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

function SlotValue({ slot }: { slot: WeatherSlotSummary }) {
  const precip = formatWeatherPrecip(slot)
  return (
    <span className="inline-flex items-baseline gap-1 font-medium tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
      <span>{slotTemp(slot)}</span>
      {precip ? (
        <span className="text-[9px] font-medium text-[var(--tt-ink-faint,#9a9a9a)]">
          {precip}
        </span>
      ) : null}
    </span>
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
      {slots.map((slot, i) => {
        const precip = formatWeatherPrecip(slot)
        return (
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
              detail={`${slot.label} ${slotTemp(slot)}${precip ? ` ${precip}` : ''}`}
            />
            <span
              className={cn(
                'flex flex-col gap-0.5 leading-none text-[var(--tt-ink-faint,#9a9a9a)]',
                textClass,
              )}
            >
              <span>
                <span className="font-normal">{slot.label}</span>{' '}
                <span className="font-medium tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
                  {slotTemp(slot)}
                </span>
              </span>
              {precip ? (
                <span
                  className={cn(
                    'font-medium tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]',
                    resolvedSize === 'lg' ? 'text-[11px]' : 'text-[9px]',
                  )}
                >
                  {precip}
                </span>
              ) : null}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Compact upcoming-day weather: horizontal or stacked icon+temp slots */
export function ListDayWeatherMini({
  weather,
  layout = 'row',
  className,
}: {
  weather: WeatherDaySummary
  /** `stack` = narrow column so workout titles keep width */
  layout?: 'row' | 'stack'
  className?: string
}) {
  const slots = weather.slots.filter(hasSlotData)
  if (slots.length === 0) return null

  if (layout === 'stack') {
    return (
      <div
        className={cn(
          'flex shrink-0 flex-col items-end gap-0.5 text-[10px] leading-none text-[var(--tt-ink-faint,#9a9a9a)]',
          className,
        )}
        aria-label={slots
          .map((s) => `${s.label} ${slotTemp(s)}${formatWeatherPrecip(s) ? ` ${formatWeatherPrecip(s)}` : ''}`)
          .join(' ')}
      >
        {slots.map((slot) => (
          <div key={slot.label} className="flex items-center gap-0.5">
            <WeatherGlyph
              glyph={slot.emoji}
              tone="muted"
              className="h-4 w-4"
            />
            <SlotValue slot={slot} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 text-[10px] text-[var(--tt-ink-faint,#9a9a9a)]',
        className,
      )}
      aria-label={slots
        .map((s) => `${s.label} ${slotTemp(s)}${formatWeatherPrecip(s) ? ` ${formatWeatherPrecip(s)}` : ''}`)
        .join(' ')}
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
          <SlotValue slot={slot} />
        </div>
      ))}
    </div>
  )
}
