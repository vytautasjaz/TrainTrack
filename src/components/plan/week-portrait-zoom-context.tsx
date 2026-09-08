'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  defaultWeekPortraitZoom,
  readStoredWeekPortraitZoom,
  stepWeekPortraitZoom,
  writeStoredWeekPortraitZoom,
  type WeekPortraitZoom,
} from '@/lib/week-portrait-zoom'

type WeekPortraitZoomContextValue = {
  zoom: WeekPortraitZoom
  setZoom: (zoom: WeekPortraitZoom) => void
  zoomIn: () => void
  zoomOut: () => void
  canZoomIn: boolean
  canZoomOut: boolean
}

const WeekPortraitZoomContext =
  createContext<WeekPortraitZoomContextValue | null>(null)

export function WeekPortraitZoomProvider({ children }: { children: ReactNode }) {
  const [zoom, setZoomState] = useState<WeekPortraitZoom>(defaultWeekPortraitZoom)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setZoomState(readStoredWeekPortraitZoom())
    setHydrated(true)
  }, [])

  const setZoom = useCallback((next: WeekPortraitZoom) => {
    setZoomState(next)
    writeStoredWeekPortraitZoom(next)
  }, [])

  const zoomIn = useCallback(() => {
    setZoomState((prev) => {
      // + = larger columns = toward comfort
      const next = stepWeekPortraitZoom(prev, -1)
      writeStoredWeekPortraitZoom(next)
      return next
    })
  }, [])

  const zoomOut = useCallback(() => {
    setZoomState((prev) => {
      // − = smaller columns = toward fit
      const next = stepWeekPortraitZoom(prev, 1)
      writeStoredWeekPortraitZoom(next)
      return next
    })
  }, [])

  const resolved = hydrated ? zoom : defaultWeekPortraitZoom()

  const value = useMemo(
    () => ({
      zoom: resolved,
      setZoom,
      zoomIn,
      zoomOut,
      canZoomIn: resolved !== 'comfort',
      canZoomOut: resolved !== 'fit',
    }),
    [resolved, setZoom, zoomIn, zoomOut],
  )

  return (
    <WeekPortraitZoomContext.Provider value={value}>
      {children}
    </WeekPortraitZoomContext.Provider>
  )
}

export function useWeekPortraitZoom(): WeekPortraitZoomContextValue {
  const ctx = useContext(WeekPortraitZoomContext)
  if (!ctx) {
    throw new Error(
      'useWeekPortraitZoom must be used within WeekPortraitZoomProvider',
    )
  }
  return ctx
}

export function useOptionalWeekPortraitZoom(): WeekPortraitZoomContextValue | null {
  return useContext(WeekPortraitZoomContext)
}
