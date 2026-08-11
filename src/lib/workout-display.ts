import { WorkoutType } from '@prisma/client'
import type { LucideIcon } from 'lucide-react'
import { Bike, Dumbbell, Footprints, Heart, Layers, Moon, Waves, Zap } from 'lucide-react'

export const WORKOUT_TYPE_DOT_CLASS: Record<WorkoutType, string> = {
  RUN: 'bg-[var(--color-sport-run)]',
  BIKE: 'bg-[var(--color-sport-bike)]',
  SWIM: 'bg-[var(--color-sport-swim)]',
  STRENGTH: 'bg-[var(--color-sport-strength)]',
  HYROX: 'bg-[var(--color-sport-hyrox)]',
  TRIATHLON: 'bg-[var(--color-sport-tri)]',
  RECOVERY: 'bg-[var(--color-sport-recovery)]',
  REST: 'bg-[var(--color-sport-rest)]',
}

/** Ultra-soft wash for week-table sport label cells */
export const WORKOUT_TYPE_CELL_TINT: Record<WorkoutType, string> = {
  RUN: 'bg-[var(--color-sport-run-bg)]',
  BIKE: 'bg-[var(--color-sport-bike-bg)]',
  SWIM: 'bg-[var(--color-sport-swim-bg)]',
  STRENGTH: 'bg-[var(--color-sport-strength-bg)]',
  HYROX: 'bg-[var(--color-sport-hyrox-bg)]',
  TRIATHLON: 'bg-[var(--color-sport-tri-bg)]',
  RECOVERY: 'bg-[var(--color-sport-recovery-bg)]',
  REST: 'bg-[var(--color-sport-rest-bg)]',
}

/** Soft sport wash for Calendar view cards (overrides status surfaces). */
export const WORKOUT_TYPE_CALENDAR_SURFACE: Record<WorkoutType, string> = {
  RUN: 'tt-calendar-card-sport tt-calendar-card-sport-run',
  BIKE: 'tt-calendar-card-sport tt-calendar-card-sport-bike',
  SWIM: 'tt-calendar-card-sport tt-calendar-card-sport-swim',
  STRENGTH: 'tt-calendar-card-sport tt-calendar-card-sport-strength',
  HYROX: 'tt-calendar-card-sport tt-calendar-card-sport-hyrox',
  TRIATHLON: 'tt-calendar-card-sport tt-calendar-card-sport-triathlon',
  RECOVERY: 'tt-calendar-card-sport tt-calendar-card-sport-recovery',
  REST: 'tt-calendar-card-sport tt-calendar-card-sport-rest',
}

export const RACE_PLAN_DOT_CLASS = 'bg-emerald-500'

/** Week table cell: highlight full cell when any workout inside is hovered */
export const PLAN_TABLE_CELL_HOVER_CLASS =
  'transition-colors has-[.plan-workout-item:hover]:bg-muted/50'

/** Marker class for workout rows inside week table cells */
export const PLAN_WORKOUT_ITEM_CLASS = 'plan-workout-item'

/** Borderless workout list item surfaces */
export const WORKOUT_CARD_CLASS = 'workout-card-interactive'
export const WORKOUT_CARD_MUTED_CLASS = 'workout-card-muted'
export const WORKOUT_DAY_CARD_CLASS = 'workout-day-card'

export const WORKOUT_TYPE_ICONS: Record<WorkoutType, LucideIcon> = {
  RUN: Footprints,
  BIKE: Bike,
  SWIM: Waves,
  STRENGTH: Dumbbell,
  HYROX: Zap,
  TRIATHLON: Layers,
  RECOVERY: Heart,
  REST: Moon,
}
