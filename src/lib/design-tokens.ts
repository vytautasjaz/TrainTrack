/**
 * TrainTrack design system (docs/DESIGN-SYSTEM.md):
 * - Inter only (`--font-sans` / `--font-display`) — weights 400–800
 * - Page titles: Inter 800 (`.title-display`)
 * - Prefer `PageHeader` / primitives in `ui/v2` over one-off chrome
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

/**
 * V2 shell tokens (CSS vars in globals.css).
 * Palette: charcoal nav, brand orange, light content — docs/DESIGN-SYSTEM.md
 * Live: `/style-guide#v2` · docs/V2-STANDARDS.md
 */
export const v2 = {
  colors: {
    brand: '#F0440A',
    charcoal: '#111315',
    pageBg: '#F5F6F7',
    textPrimary: '#15192B',
    textSecondary: '#6B7280',
    border: '#E3E6E9',
    navBg: 'var(--tt-v2-nav-bg)',
    accent: 'var(--tt-v2-accent)',
    heroBg: 'var(--tt-v2-hero-bg)',
    pageBottom: 'var(--tt-v2-page-bottom)',
    surface: 'var(--tt-v2-surface)',
    surface2: 'var(--tt-v2-surface-2)',
    ink: 'var(--tt-v2-ink)',
    inkSoft: 'var(--tt-v2-ink-soft)',
    inkFaint: 'var(--tt-v2-ink-faint)',
    weekBoard: 'var(--tt-v2-week-board)',
    card: 'var(--tt-v2-card)',
    cardInk: 'var(--tt-v2-card-ink)',
    lightInk: 'var(--tt-v2-light-ink)',
    lightInkSoft: 'var(--tt-v2-light-ink-soft)',
    lightPanel: 'var(--tt-v2-light-panel)',
  },
  shadows: {
    metric: 'var(--tt-v2-shadow-metric)',
    card: 'var(--tt-v2-shadow-card)',
    board: 'var(--tt-v2-shadow-board)',
    panel: 'var(--tt-v2-shadow-panel)',
    today: 'var(--tt-v2-shadow-today)',
  },
  surfaces: {
    page: 'tt-athlete-home-v2',
    pageShell: 'tt-athlete-home-v2-shell',
    metric: 'tt-v2-metric',
    widget: 'tt-v2-widget',
    widgetLight: 'tt-v2-widget tt-v2-widget--light',
    weekBoard: 'tt-v2-week-board',
    dayCard: 'tt-v2-day-card',
    dayCardToday: 'tt-v2-day-card tt-v2-day-card--today',
    progress: 'tt-v2-progress',
    progressLight: 'tt-v2-progress tt-v2-progress--light',
    tag: 'tt-v2-tag',
    /** 7-day modular layout helpers */
    modStack: 'tt-v2-mod-stack',
    modGrid: 'tt-v2-mod-grid',
    modWidgets: 'tt-v2-mod-widgets',
  },
  /** Modular page grid — 7 day cols + gutters; keep spans in sync with shell ::before */
  grid: {
    cols: 7,
    gutter: 'var(--tt-v2-grid-gutter)',
    size: 'var(--tt-v2-grid-size)',
    line: 'var(--tt-v2-grid-line)',
  },
  topNavHeight: 'var(--tt-top-nav-height)',
  /** Tight radius scale — use these, not one-off rounded-* rem values */
  radius: {
    none: 'var(--radius-none)',
    xs: 'var(--radius-xs)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    pill: 'var(--radius-pill)',
    workout: 'var(--radius-workout)',
  },
  /**
   * Semantic spacing — prefer over ad-hoc mt-2 / gap-3.
   * `afterTitle` = widget eyebrow → body (`tt-space-after-title`).
   */
  space: {
    micro: 'var(--tt-space-micro)',
    tight: 'var(--tt-space-tight)',
    snug: 'var(--tt-space-snug)',
    stack: 'var(--tt-space-stack)',
    section: 'var(--tt-space-section)',
    block: 'var(--tt-space-block)',
    afterTitle: 'var(--tt-space-tight)',
  },
} as const

/** App-wide radius (same scale as `v2.radius`). Prefer in className: `rounded-[var(--radius-md)]`. */
export const radius = {
  none: 'var(--radius-none)',
  xs: 'var(--radius-xs)',
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  pill: 'var(--radius-pill)',
  workout: 'var(--radius-workout)',
} as const

/** Semantic spacing roles (same as `v2.space`). */
export const space = {
  micro: 'var(--tt-space-micro)',
  tight: 'var(--tt-space-tight)',
  snug: 'var(--tt-space-snug)',
  stack: 'var(--tt-space-stack)',
  section: 'var(--tt-space-section)',
  block: 'var(--tt-space-block)',
  afterTitle: 'var(--tt-space-tight)',
} as const
