'use client'

import { createContext, useContext, type ReactNode } from 'react'
import {
  DEFAULT_SWIM_DISTANCE_UNIT,
  DEFAULT_UNIT_SYSTEM,
  type SwimDistanceUnit,
  type UnitSystem,
} from '@/lib/units'

type UnitsContextValue = {
  unitSystem: UnitSystem
  swimDistanceUnit: SwimDistanceUnit
}

const UnitsContext = createContext<UnitsContextValue>({
  unitSystem: DEFAULT_UNIT_SYSTEM,
  swimDistanceUnit: DEFAULT_SWIM_DISTANCE_UNIT,
})

export function UnitsProvider({
  unitSystem,
  swimDistanceUnit = DEFAULT_SWIM_DISTANCE_UNIT,
  children,
}: {
  unitSystem: UnitSystem
  swimDistanceUnit?: SwimDistanceUnit
  children: ReactNode
}) {
  return (
    <UnitsContext.Provider value={{ unitSystem, swimDistanceUnit }}>
      {children}
    </UnitsContext.Provider>
  )
}

export function useUnitSystem(): UnitSystem {
  return useContext(UnitsContext).unitSystem
}

export function useSwimDistanceUnit(): SwimDistanceUnit {
  return useContext(UnitsContext).swimDistanceUnit
}

export function useUnits(): UnitsContextValue {
  return useContext(UnitsContext)
}
