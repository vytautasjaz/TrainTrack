/**
 * TrainTrack visual language (redesign):
 * - UI font: Inter (`--font-sans`) — body, nav, sections, captions
 * - Display font: Bebas Neue (`--font-display`) — page H1 only (~Level 1)
 * - Prefer `PageHeader` / `PageHeaderTitle` over raw title classes
 * - Title hierarchy: see `.cursor/rules/typography-hierarchy.mdc` and `title-*` in globals.css
 */
export const typography = {
  /** Level 1 page H1 (Bebas) — same as pageTitle */
  display: 'title-display',
  displayAccent: 'title-display-accent',
  /** Level 1 page H1 (Bebas) — alias of title-display */
  pageTitle: 'title-page',
  pageTitleCompact: 'title-display title-display--compact',
  /** Level 2 section title (Inter) */
  sectionTitle: 'title-section',
  /** @deprecated Alias of title-section */
  sectionTitleLarge: 'title-section',
  sectionAccent: 'title-section-accent',
  /** @deprecated Alias of title-section */
  subTitle: 'title-section',
  /** Level 3 eyebrow / overline (Inter) */
  eyebrow: 'title-eyebrow',
  /** Level 4 card content title (Inter, sentence case) */
  cardTitle: 'title-card',
  /** Day group label (Inter) */
  dayLabel: 'title-day',
  label: 'title-eyebrow',
  body: 'text-body',
  caption: 'text-caption',
  pageHeaderDescription: 'page-header-description',
  hint: 'text-hint',
  metricXl: 'text-metric-xl',
  metricHero: 'text-metric-hero',
  tabular: 'text-tabular',
  /** @deprecated Prefer title-display / title-section */
  posterTitle: 'poster-title',
  posterTitleSm: 'poster-title poster-title-sm',
  posterTitleMd: 'poster-title poster-title-md',
  posterTitleLg: 'poster-title poster-title-lg',
  posterTitleAccent: 'poster-title-accent',
  posterMetric: 'poster-metric',
  posterMetricUnit: 'poster-metric-unit',
  posterKicker: 'poster-kicker',
  posterSupport: 'poster-support',
} as const

export const surfaces = {
  card: 'card-elevated',
  poster: 'poster-surface',
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
  abstractMotion: 'abstract-motion',
  abstractMotionSoft: 'abstract-motion-soft',
} as const

/** Semantic sport accents (CSS variables). */
export const sportColors = {
  run: 'var(--color-sport-run)',
  bike: 'var(--color-sport-bike)',
  swim: 'var(--color-sport-swim)',
  strength: 'var(--color-sport-strength)',
  hyrox: 'var(--color-sport-hyrox)',
  triathlon: 'var(--color-sport-tri)',
  race: 'var(--color-sport-race)',
} as const

export const statusColors = {
  success: 'var(--color-success)',
  skipped: 'var(--color-destructive)',
  muted: 'var(--color-tt-muted)',
} as const

export const colors = {
  accent: 'var(--color-accent)',
  accentSubtle: 'var(--color-accent-subtle)',
  accentLight: 'var(--color-accent-light)',
  accentMedium: 'var(--color-accent-medium)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textTertiary: 'var(--color-text-tertiary)',
  background: 'var(--color-background)',
  surface: 'var(--color-surface)',
  surfaceSubtle: 'var(--color-surface-subtle)',
  border: 'var(--color-border)',
  borderSubtle: 'var(--color-border-subtle)',
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
