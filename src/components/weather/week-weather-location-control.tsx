'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { WeatherPlace } from '@/lib/weather/places'
import { WeatherLocationSearch } from '@/components/weather/weather-location-search'

export type WeekWeatherLocation = {
  name: string
  isOverride?: boolean
}

type WeekWeatherLocationControlProps = {
  location?: WeekWeatherLocation | null
  onSelect: (place: WeatherPlace) => void
  onReset?: () => void
  className?: string
}

function shortLocationName(name: string) {
  return name.split(',')[0]?.trim() || name
}

export function WeekWeatherLocationControl({
  location,
  onSelect,
  onReset,
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
    const left = Math.min(
      Math.max(8, rect.left),
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
  }, [open])

  const label = location?.name
    ? shortLocationName(location.name)
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
