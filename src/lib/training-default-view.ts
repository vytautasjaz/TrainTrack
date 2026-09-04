/** Default Training tab layout (List / Week / Month). */

export type TrainingDefaultView = 'list' | 'week' | 'calendar'

export type TrainingDefaultViewRole = 'athlete' | 'coach'

export const TRAINING_DEFAULT_VIEW_OPTIONS: {
  id: TrainingDefaultView
  label: string
  hint: string
}[] = [
  {
    id: 'list',
    label: 'List',
    hint: 'Infinite scroll day list — best for day-to-day logging.',
  },
  {
    id: 'week',
    label: 'Week',
    hint: 'Week table — plan and review a full week at once.',
  },
  {
    id: 'calendar',
    label: 'Month',
    hint: 'Month calendar — overview across weeks.',
  },
]

function storageKey(role: TrainingDefaultViewRole): string {
  return `tt-default-training-view-${role}`
}

export function parseTrainingDefaultView(
  raw: string | null | undefined,
): TrainingDefaultView | null {
  if (raw === 'list' || raw === 'week' || raw === 'calendar') return raw
  if (raw === 'month') return 'calendar'
  if (raw === 'table') return 'list'
  return null
}

export function readStoredTrainingDefaultView(
  role: TrainingDefaultViewRole,
): TrainingDefaultView | null {
  if (typeof window === 'undefined') return null
  try {
    return parseTrainingDefaultView(localStorage.getItem(storageKey(role)))
  } catch {
    return null
  }
}

export function writeStoredTrainingDefaultView(
  role: TrainingDefaultViewRole,
  view: TrainingDefaultView,
) {
  try {
    localStorage.setItem(storageKey(role), view)
  } catch {
    /* ignore quota / private mode */
  }
}

/** Prefer explicit preference; otherwise mobile → List, desktop → Week. */
export function resolveTrainingDefaultView(
  stored: TrainingDefaultView | null,
  isDesktop: boolean,
): TrainingDefaultView {
  if (stored) return stored
  return isDesktop ? 'week' : 'list'
}

export function trainingDefaultViewHref(view: TrainingDefaultView): string {
  return `/training?view=${view}`
}
