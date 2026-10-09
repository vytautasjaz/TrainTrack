'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { SessionLoadThresholds } from '@/lib/training-load/session-tss'

const SessionLoadThresholdsContext = createContext<SessionLoadThresholds>({})

export function SessionLoadThresholdsProvider({
  value,
  children,
}: {
  value?: SessionLoadThresholds | null
  children: ReactNode
}) {
  return (
    <SessionLoadThresholdsContext.Provider value={value ?? {}}>
      {children}
    </SessionLoadThresholdsContext.Provider>
  )
}

export function useSessionLoadThresholds(): SessionLoadThresholds {
  return useContext(SessionLoadThresholdsContext)
}
