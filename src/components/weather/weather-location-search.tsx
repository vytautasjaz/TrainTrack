/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeatherPlace } from '@/lib/weather/places'

type WeatherLocationSearchProps = {
  selectedLabel?: string | null
  compact?: boolean
  placeholder?: string
  onSelect: (place: WeatherPlace) => void
}

export function WeatherLocationSearch({
  selectedLabel,
  compact = false,
  placeholder = 'Search for a city…',
  onSelect,
}: WeatherLocationSearchProps) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [places, setPlaces] = useState<WeatherPlace[]>([])
  const [error, setError] = useState<string | null>(null)
  const [highlight, setHighlight] = useState(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setPlaces([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/weather/locations?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('search failed')
        const data = (await res.json()) as { places?: WeatherPlace[] }
        const next = data.places ?? []
        setPlaces(next)
        setHighlight(0)
        setOpen(true)
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return
        setPlaces([])
        setError('Could not find locations right now.')
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  function choose(place: WeatherPlace) {
    onSelect(place)
    setQuery('')
    setPlaces([])
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <div className="relative">
        <MapPin
          className={cn(
            'pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground',
            compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
          )}
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (places.length > 0) setOpen(true)
          }}
          onKeyDown={(e) => {
            if (!open || places.length === 0) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlight((i) => Math.min(places.length - 1, i + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlight((i) => Math.max(0, i - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const place = places[highlight]
              if (place) choose(place)
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={selectedLabel ? `Change from ${selectedLabel}` : placeholder}
          className={cn(
            'w-full rounded-[6px] border border-border bg-background pl-8 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compact ? 'h-8 text-xs' : 'h-9 text-sm',
          )}
        />
      </div>
      {open && (query.trim().length >= 2 || places.length > 0 || error) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-[8px] border border-border bg-card py-1 shadow-md"
        >
          {loading && places.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">Searching Yr locations…</li>
          ) : error ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">{error}</li>
          ) : places.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">No matching Yr locations.</li>
          ) : (
            places.map((place, index) => (
              <li key={place.id} role="option" aria-selected={index === highlight}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(place)}
                  className={cn(
                    'flex w-full flex-col items-start px-3 py-1.5 text-left',
                    index === highlight ? 'bg-muted' : 'hover:bg-muted/60',
                  )}
                >
                  <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
                    {place.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{place.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
