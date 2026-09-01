export const WORKOUT_FEELING_MIN = 1
export const WORKOUT_FEELING_MAX = 10

export type WorkoutFeelingTone = 'bad' | 'ok' | 'good'

export function parseWorkoutFeeling(raw: unknown): number | null {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw.trim()
        ? Number.parseInt(raw, 10)
        : Number.NaN
  if (!Number.isInteger(n) || n < WORKOUT_FEELING_MIN || n > WORKOUT_FEELING_MAX) {
    return null
  }
  return n
}

export function workoutFeelingTone(feeling: number): WorkoutFeelingTone {
  if (feeling <= 3) return 'bad'
  if (feeling <= 7) return 'ok'
  return 'good'
}

export function workoutFeelingLabel(feeling: number): string {
  if (feeling <= 2) return 'Rough'
  if (feeling <= 4) return 'Tough'
  if (feeling <= 6) return 'OK'
  if (feeling <= 8) return 'Good'
  return 'Great'
}

export const WORKOUT_FEELING_BUBBLE_CLASS: Record<WorkoutFeelingTone, string> = {
  bad: 'border border-[#f5a3a3]/80 bg-[#fdf2f2] text-[#7f1d1d]',
  ok: 'border border-[#fcd34d]/80 bg-[#fffbeb] text-[#92400e]',
  good: 'border border-[#86d39a]/80 bg-[#f0faf4] text-[#14532d]',
}

export const WORKOUT_FEELING_META_CLASS: Record<WorkoutFeelingTone, string> = {
  bad: 'text-[#b91c1c]/80',
  ok: 'text-[#b45309]/80',
  good: 'text-[#1b7a4d]/80',
}

export const WORKOUT_FEELING_SWATCH_CLASS: Record<WorkoutFeelingTone, string> = {
  bad: 'border-[#f5a3a3] bg-[#fdf2f2] text-[#b91c1c]',
  ok: 'border-[#fcd34d] bg-[#fffbeb] text-[#b45309]',
  good: 'border-[#86d39a] bg-[#f0faf4] text-[#1b7a4d]',
}

export const WORKOUT_FEELING_INK: Record<WorkoutFeelingTone, string> = {
  bad: '#b91c1c',
  ok: '#ca8a04',
  good: '#1b7a4d',
}

export const WORKOUT_FEELING_SCALE_GRADIENT =
  'linear-gradient(to right, #b91c1c 0%, #ea580c 22%, #eab308 50%, #65a30d 78%, #1b7a4d 100%)'
