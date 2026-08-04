import { WorkoutType } from '@prisma/client'
import type { LucideIcon } from 'lucide-react'
import { Bike, Dumbbell, Footprints, Heart, Layers, Moon, Waves, Zap } from 'lucide-react'

export const WORKOUT_TYPE_DOT_CLASS: Record<WorkoutType, string> = {
  RUN: 'bg-orange-500',
  BIKE: 'bg-sky-500',
  SWIM: 'bg-cyan-500',
  STRENGTH: 'bg-emerald-500',
  HYROX: 'bg-rose-500',
  TRIATHLON: 'bg-indigo-500',
  RECOVERY: 'bg-violet-500',
  REST: 'bg-zinc-400',
}

/** Ultra-soft wash for week-table sport label cells */
export const WORKOUT_TYPE_CELL_TINT: Record<WorkoutType, string> = {
  RUN: 'bg-orange-500/[0.04]',
  BIKE: 'bg-sky-500/[0.04]',
  SWIM: 'bg-cyan-500/[0.04]',
  STRENGTH: 'bg-emerald-500/[0.04]',
  HYROX: 'bg-rose-500/[0.04]',
  TRIATHLON: 'bg-indigo-500/[0.04]',
  RECOVERY: 'bg-violet-500/[0.04]',
  REST: 'bg-zinc-500/[0.04]',
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
