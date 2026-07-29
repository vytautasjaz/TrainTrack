import type { SwimWorkoutStructure } from './types'
import { swimWorkoutStructureSchema } from './schema'

export function parseSwimStructure(raw: unknown): SwimWorkoutStructure | null {
  if (!raw || typeof raw !== 'object') return null
  const parsed = swimWorkoutStructureSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}
