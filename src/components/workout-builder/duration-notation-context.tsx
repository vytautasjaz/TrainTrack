'use client'

import { createContext, useContext, type ReactNode } from 'react'
import {
  DEFAULT_DURATION_NOTATION,
  type DurationNotation,
} from '@/lib/workout-builder/duration-notation'

const DurationNotationContext = createContext<DurationNotation>(DEFAULT_DURATION_NOTATION)

export function DurationNotationProvider({
  notation,
  children,
}: {
  notation: DurationNotation
  children: ReactNode
}) {
  return (
    <DurationNotationContext.Provider value={notation}>
      {children}
    </DurationNotationContext.Provider>
  )
}

export function useDurationNotation(): DurationNotation {
  return useContext(DurationNotationContext)
}
