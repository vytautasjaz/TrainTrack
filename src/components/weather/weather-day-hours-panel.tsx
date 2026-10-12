'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { updateAthleteWeatherLocation } from '@/app/actions/preferences'
import { WeatherGlyph } from '@/components/weather/weather-glyph'
import { WeatherLocationSearch } from '@/components/weather/weather-location-search'
import {
  formatWeatherLocationCompact,
  formatWeatherPrecip,
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
}: {
  label: string
  emoji: string
  temperatureC: number | null
  precip: string
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
    />
  )
}

export function WeatherDayHoursTrigger({
  weather,
  locationName = null,
  className,
  children,
}: {
  weather: WeatherDaySummary
  locationName?: string | null
  className?: string
  children: ReactNode
}) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [pendingLocation, setPendingLocation] = useState<string | null>(null)
  const [editingLocation, setEditingLocation] = useState(false)
  const [open, setOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [pos, setPos] = useState<{
    left: number
    top: number
    maxHeight: number
  } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const effectiveLocationName = pendingLocation ?? locationName
  const locationLabel = effectiveLocationName?.trim()
    ? formatWeatherLocationCompact(effectiveLocationName.trim())
    : null
  const hours = weather.hours ?? []
  const slots = weather.slots.filter(
    (s) => s.temperatureC != null || Boolean(formatWeatherPrecip(s)),
  )
  const hasDetail = hours.length > 0 || slots.length > 0
  const panelWidth = editingLocation ? 280 : 240
  const scrollAnchorIndex =
    hours.length > 0 ? trainingStartHourIndex(hours) : -1

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setEditingLocation(false)
      return
    }

    function place() {
      const el = triggerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const gap = 6
      const preferredHeight = 320
      const spaceBelow = window.innerHeight - rect.bottom - gap - 8
      const spaceAbove = rect.top - gap - 8
      const openBelow = spaceBelow >= 120 || spaceBelow >= spaceAbove
      const maxHeight = Math.min(
        preferredHeight,
        Math.max(140, openBelow ? spaceBelow : spaceAbove),
      )
      const top = openBelow
        ? rect.bottom + gap
        : Math.max(8, rect.top - gap - maxHeight)
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - panelWidth - 8,
      )
      setPos({ left, top, maxHeight })
    }

    place()
    function onScroll(e: Event) {
      // Keep open when scrolling inside the panel; close on page/container scroll.
      const target = e.target
      if (
        target instanceof Node &&
        panelRef.current &&
        (target === panelRef.current || panelRef.current.contains(target))
      ) {
        return
      }
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (editingLocation) {
          setEditingLocation(false)
          return
        }
        setOpen(false)
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target)) return

      // Clicks inside the panel close it — except while changing location.
      if (panelRef.current?.contains(target)) {
        const el = target instanceof Element ? target : target.parentElement
        if (el?.closest('[data-weather-location-control]')) return
        setOpen(false)
        return
      }
      setOpen(false)
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, editingLocation, panelWidth])

  // After open + layout, jump so ~06:00 is the first visible row.
  useEffect(() => {
    if (!open || !pos || hours.length === 0 || editingLocation) return
    const list = listRef.current
    if (!list) return
    const anchor = list.querySelector('[data-weather-scroll-anchor]')
    if (!(anchor instanceof HTMLElement)) return
    const top =
      anchor.getBoundingClientRect().top -
      list.getBoundingClientRect().top +
      list.scrollTop
    list.scrollTop = Math.max(0, top)
  }, [open, pos, hours, editingLocation])

  useEffect(() => {
    setPendingLocation(null)
  }, [locationName])

  async function saveLocation(place: WeatherPlace) {
    setPendingLocation(place.label)
    setEditingLocation(false)
    setIsPending(true)
    try {
      const formData = new FormData()
      formData.set('weatherLocationName', place.label)
      formData.set('weatherLat', String(place.lat))
      formData.set('weatherLon', String(place.lon))
      await updateAthleteWeatherLocation(formData)
      router.refresh()
    } finally {
      setIsPending(false)
    }
  }

  if (!hasDetail) {
    return <div className={className}>{children}</div>
  }

  const panel =
    open && portalReady && pos
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Weather details"
            data-tt-weather-hours-panel
            className={cn(
              'fixed z-[300] flex flex-col overflow-hidden rounded-[var(--radius-lg)]',
              'border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white shadow-lg',
            )}
            style={{
              left: pos.left,
              top: pos.top,
              width: panelWidth,
              maxHeight: pos.maxHeight,
            }}
          >
            <div className="shrink-0 border-b border-[var(--tt-line,#eee)] px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                {hours.length > 0 ? 'Hour by hour' : 'Today’s forecast'}
              </p>
              <div data-weather-location-control className="mt-0.5">
                {editingLocation ? (
                  <div className="mt-1">
                    <WeatherLocationSearch
                      compact
                      selectedLabel={effectiveLocationName}
                      placeholder="Search location…"
                      onSelect={saveLocation}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      'max-w-full truncate text-left text-[11px] font-medium',
                      'text-[var(--tt-ink-soft,#6b6b6b)] underline decoration-[var(--tt-line,#ddd)] underline-offset-2',
                      'transition hover:text-[var(--tt-v2-light-ink,#111)]',
                      isPending && 'opacity-60',
                    )}
                    title={
                      effectiveLocationName
                        ? `${effectiveLocationName} — change location`
                        : 'Set weather location'
                    }
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingLocation(true)
                    }}
                  >
                    {locationLabel ?? 'Set location'}
                  </button>
                )}
              </div>
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
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'cursor-pointer rounded-[var(--radius-sm)] text-left transition',
          'hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-v2-accent)]/40',
          open && 'bg-black/[0.02]',
          className,
        )}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        title="Show hour-by-hour weather"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        {children}
      </button>
      {panel}
    </>
  )
}
