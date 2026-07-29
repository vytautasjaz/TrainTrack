import type { SessionType } from '@prisma/client'

export type SessionIntensity = {
  label: string
  className: string
}

const SESSION_INTENSITY: Partial<Record<SessionType, SessionIntensity>> = {
  EASY_RUN: {
    label: 'Easy',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  RECOVERY_RUN: {
    label: 'Recovery',
    className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
  LONG_RUN: {
    label: 'Moderate',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  TEMPO: {
    label: 'Moderate',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  THRESHOLD: {
    label: 'Hard',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
  VO2_MAX: {
    label: 'Hard',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
  INTERVALS: {
    label: 'Hard',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
  HILL_REPEATS: {
    label: 'Hard',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
  FARTLEK: {
    label: 'Moderate',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  RACE_PACE: {
    label: 'Hard',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
  BRICK: {
    label: 'Hard',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
  STRENGTH: {
    label: 'Strength',
    className: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  },
  HYROX: {
    label: 'Hard',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
  CROSS_TRAINING: {
    label: 'Easy',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
}

export function getSessionIntensity(sessionType: SessionType): SessionIntensity | null {
  return SESSION_INTENSITY[sessionType] ?? null
}
