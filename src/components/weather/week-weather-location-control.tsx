'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { WeatherPlace } from '@/lib/weather/places'
import { formatWeatherLocationCompact } from '@/lib/weather/places'
import { WeatherLocationSearch } from '@/components/weather/weather-location-search'

export type WeekWeatherLocation = {
  name: string
  isOverride?: boolean
}

type WeekWeatherLocationControlProps = {
  location?: WeekWeatherLocation | null
  onSelect: (place: WeatherPlace) => void
  onReset?: () => void
  /** Prefer panel under the right edge of the trigger (Home header). */
  align?: 'start' | 'end'
  className?: string
}

export function WeekWeatherLocationControl({
  location,
  onSelect,
  onReset,
  align = 'start',
  className,
}: WeekWeatherLocationControlProps) {
  const buttonId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  function updatePos() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 260
    const preferred =
      align === 'end' ? rect.right - width : rect.left
    const left = Math.min(
      Math.max(8, preferred),
      Math.max(8, window.innerWidth - width - 8),
    )
    setPos({ top: rect.bottom + 4, left })
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    function onScrollOrResize() {
      updatePos()
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('mousedown', onPointerDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reposition when open/align
  }, [open, align])

  const label = location?.name
    ? formatWeatherLocationCompact(location.name)
    : 'Set location'

  return (
    <>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        onClick={() => {
          setOpen((prev) => !prev)
        }}
        title={location?.name ?? 'Set weather location'}
        aria-expanded={open}
        className={cn(
          'max-w-full truncate text-left font-normal leading-tight text-muted-foreground/90 underline decoration-border underline-offset-2 transition hover:text-foreground',
          className,
        )}
      >
        {label}
        {location?.isOverride ? (
          <span className="ml-0.5 no-underline opacity-70">*</span>
        ) : null}
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-labelledby={buttonId}
              className="fixed z-50 w-[260px] rounded-[8px] border border-border bg-card p-2 shadow-md"
              style={{ top: pos.top, left: pos.left }}
            >
              <WeatherLocationSearch
                compact
                selectedLabel={location?.name ?? null}
                placeholder="Search location…"
                onSelect={(place) => {
                  onSelect(place)
                  setOpen(false)
                }}
              />
              {location?.isOverride && onReset ? (
                <button
                  type="button"
                  onClick={() => {
                    onReset()
                    setOpen(false)
                  }}
                  className="mt-1.5 h-7 w-full rounded-[6px] border border-border px-2 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Use default
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
