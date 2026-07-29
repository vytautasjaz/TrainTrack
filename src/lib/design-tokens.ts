/**
 * Design system token map — CSS utilities and theme vars live in `src/app/globals.css`.
 * Minimal look: 6px radius, #E5E7EB borders, no shadows, ink primary.
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
  input: 'input-field',
  inputCompact: 'input-field-compact',
  inputCompactMono: 'input-field-compact-mono',
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
