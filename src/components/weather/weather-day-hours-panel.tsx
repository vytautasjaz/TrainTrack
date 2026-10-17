'use client'

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import { format } from 'date-fns'
import { WeatherGlyph } from '@/components/weather/weather-glyph'
import { WeatherLocationSearch } from '@/components/weather/weather-location-search'
import {
  formatWeatherLocationCompact,
  formatWeatherPrecip,
  formatWeatherWind,
  type WeatherDaySummary,
  type WeatherHourSummary,
  type WeatherPlace,
  type WeatherSlotSummary,
} from '@/lib/weather/places'
import { cn } from '@/lib/utils'

/** Open scrolled so ~06:00 is at the top (earlier hours still available above). */
const TRAINING_DAY_START_HOUR = 6

function hourLabel(timeIso: string) {
  return format(new Date(timeIso), 'HH:mm')
}

function localHour(timeIso: string) {
  return new Date(timeIso).getHours()
}

function trainingStartHourIndex(hours: WeatherHourSummary[]) {
  const idx = hours.findIndex(
    (hour) => localHour(hour.timeIso) >= TRAINING_DAY_START_HOUR,
  )
  return idx >= 0 ? idx : 0
}

function DetailRow({
  label,
  emoji,
  temperatureC,
  precip,
  wind,
}: {
  label: string
  emoji: string
  temperatureC: number | null
  precip: string
  wind: string
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-[12px] leading-none">
      <span className="w-14 shrink-0 tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
        {label}
      </span>
      <WeatherGlyph glyph={emoji} tone="muted" className="h-6 w-6 shrink-0" />
      <span className="w-8 shrink-0 font-medium tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
        {temperatureC != null ? `${temperatureC}°` : '—'}
      </span>
      {wind ? (
        <span className="min-w-[2.75rem] shrink-0 tabular-nums text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
          {wind}
        </span>
      ) : (
        <span className="min-w-[2.75rem] shrink-0" aria-hidden />
      )}
      {precip ? (
        <span className="min-w-0 truncate tabular-nums text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
          {precip}
        </span>
      ) : null}
    </div>
  )
}

function HourRow({ hour }: { hour: WeatherHourSummary }) {
  return (
    <DetailRow
      label={hourLabel(hour.timeIso)}
      emoji={hour.emoji}
      temperatureC={hour.temperatureC}
      precip={formatWeatherPrecip(hour)}
      wind={formatWeatherWind(hour)}
    />
  )
}

function SlotRow({ slot }: { slot: WeatherSlotSummary }) {
  return (
    <DetailRow
      label={slot.label}
      emoji={slot.emoji}
      temperatureC={slot.temperatureC}
      precip={formatWeatherPrecip(slot)}
      wind={formatWeatherWind(slot)}
    />
  )
}

export function weatherDayHoursHasDetail(weather: WeatherDaySummary): boolean {
  const hours = weather.hours ?? []
  if (hours.length > 0) return true
  return weather.slots.some(
    (s) => s.temperatureC != null || Boolean(formatWeatherPrecip(s)),
  )
}

export type WeatherDayHoursPanelProps = {
  weather: WeatherDaySummary
  locationName?: string | null
  editingLocation?: boolean
  locationPending?: boolean
  panelId?: string
  panelRef?: Ref<HTMLDivElement>
  className?: string
  style?: CSSProperties
  onEditLocation?: () => void
  onSelectLocation?: (place: WeatherPlace) => void
  /** When false, hide the location editor (e.g. location is managed elsewhere). */
  showLocationControl?: boolean
}

/**
 * Hour-by-hour weather tooltip panel (shared by home + training week).
 * Positioning / open state live in `WeatherDayHoursTrigger`.
 */
export function WeatherDayHoursPanel({
  weather,
  locationName = null,
  editingLocation = false,
  locationPending = false,
  panelId,
  panelRef,
  className,
  style,
  onEditLocation,
  onSelectLocation,
  showLocationControl = true,
}: WeatherDayHoursPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const hours = weather.hours ?? []
  const slots = weather.slots.filter(
    (s) => s.temperatureC != null || Boolean(formatWeatherPrecip(s)),
  )
  const locationLabel = locationName?.trim()
    ? formatWeatherLocationCompact(locationName.trim())
    : null
  const scrollAnchorIndex =
    hours.length > 0 ? trainingStartHourIndex(hours) : -1

  // Jump so ~06:00 is the first visible row after mount / weather change.
  useEffect(() => {
    if (hours.length === 0 || editingLocation) return
    const list = listRef.current
    if (!list) return
    const anchor = list.querySelector('[data-weather-scroll-anchor]')
    if (!(anchor instanceof HTMLElement)) return
    const top =
      anchor.getBoundingClientRect().top -
      list.getBoundingClientRect().top +
      list.scrollTop
    list.scrollTop = Math.max(0, top)
  }, [hours, editingLocation, weather.dateKey])

  return (
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-label="Weather details"
      data-tt-weather-hours-panel
      className={cn(
        'flex flex-col overflow-hidden rounded-[var(--radius-lg)]',
        'border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white shadow-lg',
        className,
      )}
      style={style}
    >
      <div className="shrink-0 border-b border-[var(--tt-line,#eee)] px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
          {hours.length > 0 ? 'Hour by hour' : 'Today’s forecast'}
        </p>
        {showLocationControl ? (
          <div data-weather-location-control className="mt-0.5">
            {editingLocation ? (
              <div className="mt-1">
                <WeatherLocationSearch
                  compact
                  selectedLabel={locationName}
                  placeholder="Search location…"
                  onSelect={(place) => onSelectLocation?.(place)}
                />
              </div>
            ) : (
              <button
                type="button"
                className={cn(
                  'max-w-full truncate text-left text-[11px] font-medium',
                  'text-[var(--tt-ink-soft,#6b6b6b)] underline decoration-[var(--tt-line,#ddd)] underline-offset-2',
                  'transition hover:text-[var(--tt-v2-light-ink,#111)]',
                  locationPending && 'opacity-60',
                )}
                title={
                  locationName
                    ? `${locationName} — change location`
                    : 'Set weather location'
                }
                disabled={locationPending || !onEditLocation}
                onClick={(e) => {
                  e.stopPropagation()
                  onEditLocation?.()
                }}
              >
                {locationLabel ?? 'Set location'}
              </button>
            )}
          </div>
        ) : locationLabel ? (
          <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--tt-ink-soft,#6b6b6b)]">
            {locationLabel}
          </p>
        ) : null}
      </div>
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="divide-y divide-[var(--tt-line,#eee)]">
          {hours.length > 0
            ? hours.map((hour, index) => (
                <div
                  key={hour.timeIso}
                  data-weather-scroll-anchor={
                    index === scrollAnchorIndex ? '' : undefined
                  }
                >
                  <HourRow hour={hour} />
                </div>
              ))
            : slots.map((slot) => (
                <SlotRow key={slot.label} slot={slot} />
              ))}
        </div>
      </div>
    </div>
  )
}
