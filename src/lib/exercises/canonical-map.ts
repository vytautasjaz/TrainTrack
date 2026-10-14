/**
 * Light curated variation → canonical links (Phase 5).
 * Keys are variation exercise ids; values are canonicalExerciseId.
 * Only applied when both ids exist in the library.
 */
export const EXERCISE_CANONICAL_MAP: Record<string, string> = {
  barbell_romanian_deadlift: 'romanian_deadlift',
  dumbbell_romanian_deadlift: 'romanian_deadlift',
  single_leg_romanian_deadlift: 'romanian_deadlift',
  stiff_leg_deadlift: 'deadlift',
  deficit_deadlift: 'deadlift',
  sumo_deadlift: 'deadlift',
  trap_bar_deadlift: 'deadlift',
  barbell_back_squat: 'back_squat',
  dumbbell_bench_press: 'bench_press',
  incline_bench_press: 'bench_press',
  decline_bench_press: 'bench_press',
  close_grip_bench_press: 'bench_press',
  barbell_bench_press: 'bench_press',
  heavy_sled_push: 'sled_push',
  light_sled_push: 'sled_push',
  sled_drag: 'sled_pull',
  backward_sled_drag: 'sled_pull',
  wall_ball_squat: 'wall_ball',
  single_arm_farmer_carry: 'farmer_carry',
  skierg_easy: 'skierg',
  skierg_intervals: 'skierg',
  skierg_sprint: 'skierg',
  skierg_threshold: 'skierg',
}

export function variationTypeFor(
  variationId: string,
  canonicalId: string,
): string {
  if (variationId.includes('dumbbell') || variationId.startsWith('db_')) {
    return 'DUMBBELL'
  }
  if (variationId.includes('barbell') || variationId.startsWith('bb_')) {
    return 'BARBELL'
  }
  if (variationId.includes('incline')) return 'INCLINE'
  if (variationId.includes('decline')) return 'DECLINE'
  if (variationId.includes('sumo')) return 'SUMO'
  if (variationId.includes('deficit')) return 'DEFICIT'
  if (variationId.includes('heavy')) return 'HEAVY'
  if (variationId.includes('light')) return 'LIGHT'
  if (canonicalId === 'skierg' && variationId !== 'skierg') return 'INTENSITY'
  return 'VARIANT'
}
