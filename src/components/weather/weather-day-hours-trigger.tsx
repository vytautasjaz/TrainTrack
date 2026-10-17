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
import { updateAthleteWeatherLocation } from '@/app/actions/preferences'
import {
  WeatherDayHoursPanel,
  weatherDayHoursHasDetail,
} from '@/components/weather/weather-day-hours-panel'
import type { WeatherDaySummary, WeatherPlace } from '@/lib/weather/places'
import { cn } from '@/lib/utils'

export type WeatherDayHoursTriggerProps = {
  weather: WeatherDaySummary
  locationName?: string | null
  className?: string
  children: ReactNode
  /** When false, panel still shows location label but no in-panel search. */
  allowLocationEdit?: boolean
  /**
   * Training week uses URL/local override for forecast coords. When set, call
   * this so the table refetch matches the new place (and persist preferences).
   */
  onLocationSelect?: (place: WeatherPlace) => void
}

/**
 * Clickable wrapper that opens the shared hour-by-hour weather tooltip panel.
 * Used on home week board, home header strip, and training week weather cells.
 */
export function WeatherDayHoursTrigger({
  weather,
  locationName = null,
  className,
  children,
  allowLocationEdit = true,
  onLocationSelect,
}: WeatherDayHoursTriggerProps) {
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
  const panelId = useId()

  const effectiveLocationName = pendingLocation ?? locationName
  const hasDetail = weatherDayHoursHasDetail(weather)
  const panelWidth = editingLocation ? 300 : 292

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

  useEffect(() => {
    setPendingLocation(null)
  }, [locationName])

  async function saveLocation(place: WeatherPlace) {
    setPendingLocation(place.label)
    setEditingLocation(false)
    setOpen(false)
    setIsPending(true)
    try {
      // Week plan forecast is driven by ?wlat&wlon — update that first so
      // temperatures and the Weather column label refetch together.
      onLocationSelect?.(place)

      try {
        const formData = new FormData()
        formData.set('weatherLocationName', place.label)
        formData.set('weatherLat', String(place.lat))
        formData.set('weatherLon', String(place.lon))
        await updateAthleteWeatherLocation(formData)
      } catch {
        // URL override path may still succeed (e.g. coach session edge cases).
      }
      // Home (no URL override) needs an RSC refresh to pick up new coords.
      if (!onLocationSelect) {
        router.refresh()
      }
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
          <WeatherDayHoursPanel
            weather={weather}
            locationName={effectiveLocationName}
            editingLocation={editingLocation}
            locationPending={isPending}
            panelId={panelId}
            panelRef={panelRef}
            showLocationControl={allowLocationEdit}
            onEditLocation={
              allowLocationEdit ? () => setEditingLocation(true) : undefined
            }
            onSelectLocation={allowLocationEdit ? saveLocation : undefined}
            className="fixed z-[300]"
            style={{
              left: pos.left,
              top: pos.top,
              width: panelWidth,
              maxHeight: pos.maxHeight,
            }}
          />,
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
