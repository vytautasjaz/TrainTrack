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
  WEEK_CARD_SIZE_STORAGE_KEY,
  defaultWeekCardSize,
  readStoredWeekCardSize,
  writeStoredWeekCardSize,
  type WeekCardSize,
} from '@/lib/week-card-size'

type WeekCardSizeContextValue = {
  cardSize: WeekCardSize
  setCardSize: (size: WeekCardSize) => void
}

const WeekCardSizeContext = createContext<WeekCardSizeContextValue | null>(null)

export function WeekCardSizeProvider({
  children,
  storageKey = WEEK_CARD_SIZE_STORAGE_KEY,
}: {
  children: ReactNode
  /** Persist separately per view (week vs month). */
  storageKey?: string
}) {
  const [cardSize, setCardSizeState] = useState<WeekCardSize>(defaultWeekCardSize)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCardSizeState(readStoredWeekCardSize(storageKey))
    setHydrated(true)
  }, [storageKey])

  const setCardSize = useCallback(
    (size: WeekCardSize) => {
      setCardSizeState(size)
      writeStoredWeekCardSize(size, storageKey)
    },
    [storageKey],
  )

  const value = useMemo(
    () => ({
      cardSize: hydrated ? cardSize : defaultWeekCardSize(),
      setCardSize,
    }),
    [cardSize, hydrated, setCardSize],
  )

  return (
    <WeekCardSizeContext.Provider value={value}>
      {children}
    </WeekCardSizeContext.Provider>
  )
}

export function useWeekCardSize(): WeekCardSizeContextValue {
  const ctx = useContext(WeekCardSizeContext)
  if (!ctx) {
    throw new Error('useWeekCardSize must be used within WeekCardSizeProvider')
  }
  return ctx
}

export function useOptionalWeekCardSize(): WeekCardSizeContextValue | null {
  return useContext(WeekCardSizeContext)
}
