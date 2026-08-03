/**
 * Design system token map — CSS utilities and theme vars live in `src/app/globals.css`.
 * Design System v3: Inter, 8px spacing, 12px shell cards, 0px calendar workout blocks.
 */
export const typography = {
  pageTitle: 'text-page-title',
  sectionTitle: 'text-section-title',
  cardTitle: 'text-card-title',
  label: 'text-label',
  body: 'text-body',
  caption: 'text-caption',
  hint: 'text-hint',
  metricXl: 'text-metric-xl',
  metricHero: 'text-metric-hero',
  tabular: 'text-tabular',
} as const

export const surfaces = {
  card: 'card-elevated',
  workoutCard: 'workout-card-interactive',
  workoutCardMuted: 'workout-card-muted',
  workoutDayCard: 'workout-day-card',
  workoutBlock: 'tt-workout-block',
  workoutBlockPlanned: 'tt-workout-block-planned',
  workoutBlockCompleted: 'tt-workout-block-completed',
  workoutBlockSkipped: 'tt-workout-block-skipped',
  workoutBlockAdjusted: 'tt-workout-block-adjusted',
  input: 'input-field',
  inputCompact: 'input-field-compact',
  inputCompactMono: 'input-field-compact-mono',
} as const

/** Design System v3 sport accents (CSS variables). */
export const sportColors = {
  run: 'var(--color-sport-run)',
  bike: 'var(--color-sport-bike)',
  swim: 'var(--color-sport-swim)',
  triathlon: 'var(--color-sport-tri)',
  race: 'var(--color-sport-race)',
} as const

export const statusColors = {
  success: 'var(--color-success)',
  skipped: 'var(--color-destructive)',
  muted: 'var(--color-tt-muted)',
} as const

export const form = {
  field: 'FormField',
  section: 'FormSection',
  label: 'FormLabel',
  messageError: 'text-destructive text-body',
  messageSuccess: 'text-success text-body',
} as const

export const controls = {
  segmentedControl: 'segmented-control',
  segmentedItem: 'segmented-control-item',
  segmentedItemActive: 'segmented-control-item-active',
  segmentedItemInactive: 'segmented-control-item-inactive',
  pillItem: 'pill-select-item',
  pillItemActive: 'pill-select-item-active',
  pillItemInactive: 'pill-select-item-inactive',
  pillItemBrand: 'pill-select-item-brand',
} as const
