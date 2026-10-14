import type { PrescriptionMode } from '@/lib/workout-builder/structure-v2'

/** Seed/library prescription type → v2 prescription.mode */
const MODE_MAP: Record<string, PrescriptionMode> = {
  REPS: 'REPS',
  TIME: 'TIME',
  DISTANCE: 'DISTANCE',
  CALORIES: 'CALORIES',
  UNTIMED: 'UNTIMED',
  // WEIGHT / RPE / PACE live on load/target — still offer REPS as default mode
  WEIGHT: 'REPS',
  RPE: 'REPS',
  PACE: 'DISTANCE',
  PERCENT_1RM: 'REPS',
}

export function prescriptionModesForExercise(
  prescriptionTypes: string[],
): PrescriptionMode[] {
  const modes: PrescriptionMode[] = []
  for (const t of prescriptionTypes) {
    const mapped = MODE_MAP[t.toUpperCase()]
    if (mapped && !modes.includes(mapped)) modes.push(mapped)
  }
  if (modes.length === 0) return ['REPS', 'TIME', 'DISTANCE']
  return modes
}

export function defaultPrescriptionMode(
  prescriptionTypes: string[],
): PrescriptionMode {
  return prescriptionModesForExercise(prescriptionTypes)[0] ?? 'REPS'
}

export function supportsLoad(prescriptionTypes: string[]): boolean {
  return prescriptionTypes.some((t) =>
    ['WEIGHT', 'PERCENT_1RM', 'RPE'].includes(t.toUpperCase()),
  )
}
