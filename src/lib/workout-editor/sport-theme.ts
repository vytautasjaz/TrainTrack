import { WorkoutType } from '@prisma/client'

export type WorkoutEditorSportTheme = {
  /** Card surface: border + soft fill */
  card: string
  /** Circular sport icon wrap */
  iconWrap: string
  /** Auto chip when active */
  chipOn: string
  /** Auto chip when idle */
  chipOff: string
  /** Primary metric / indoor toggle when active */
  controlOn: string
  /** Duration unit accent when primary */
  unitAccent: string
  /** Soft section header (Workout Details) */
  section: string
  /** Section header text / icons */
  sectionText: string
  /** Focus ring / open select accent */
  focus: string
  /** Modal hero gradient (`bg-gradient-to-b` from/to). */
  heroGradient: string
}

const THEMES: Record<WorkoutType, WorkoutEditorSportTheme> = {
  RUN: {
    card: 'border-[var(--color-sport-run-border)] bg-[var(--color-sport-run-bg)]',
    iconWrap: 'bg-[color-mix(in_oklab,var(--color-sport-run)_20%,white)] text-[var(--color-sport-run)]',
    chipOn: 'bg-[color-mix(in_oklab,var(--color-sport-run)_22%,white)] text-[var(--color-sport-run)]',
    chipOff:
      'border border-[var(--color-sport-run-border)] text-[var(--color-sport-run)]/75 hover:bg-[var(--color-sport-run-bg)]',
    controlOn:
      'border-[var(--color-sport-run)] bg-[color-mix(in_oklab,var(--color-sport-run)_18%,white)] text-[var(--color-sport-run)]',
    unitAccent: 'text-[var(--color-sport-run)] hover:bg-[var(--color-sport-run-bg)]',
    section: 'bg-[var(--color-sport-run-bg)] hover:bg-[color-mix(in_oklab,var(--color-sport-run)_12%,white)]',
    sectionText: 'text-[var(--color-sport-run)]',
    focus: 'data-[state=open]:border-[var(--color-sport-run)]',
    heroGradient: 'from-white to-[var(--color-sport-run-bg)]',
  },
  BIKE: {
    card: 'border-[var(--color-sport-bike-border)] bg-[var(--color-sport-bike-bg)]',
    iconWrap: 'bg-[color-mix(in_oklab,var(--color-sport-bike)_20%,white)] text-[var(--color-sport-bike)]',
    chipOn: 'bg-[color-mix(in_oklab,var(--color-sport-bike)_22%,white)] text-[var(--color-sport-bike)]',
    chipOff:
      'border border-[var(--color-sport-bike-border)] text-[var(--color-sport-bike)]/75 hover:bg-[var(--color-sport-bike-bg)]',
    controlOn:
      'border-[var(--color-sport-bike)] bg-[color-mix(in_oklab,var(--color-sport-bike)_18%,white)] text-[var(--color-sport-bike)]',
    unitAccent: 'text-[var(--color-sport-bike)] hover:bg-[var(--color-sport-bike-bg)]',
    section: 'bg-[var(--color-sport-bike-bg)] hover:bg-[color-mix(in_oklab,var(--color-sport-bike)_12%,white)]',
    sectionText: 'text-[var(--color-sport-bike)]',
    focus: 'data-[state=open]:border-[var(--color-sport-bike)]',
    heroGradient: 'from-white to-[var(--color-sport-bike-bg)]',
  },
  SWIM: {
    card: 'border-[var(--color-sport-swim-border)] bg-[var(--color-sport-swim-bg)]',
    iconWrap: 'bg-[color-mix(in_oklab,var(--color-sport-swim)_20%,white)] text-[var(--color-sport-swim)]',
    chipOn: 'bg-[color-mix(in_oklab,var(--color-sport-swim)_22%,white)] text-[var(--color-sport-swim)]',
    chipOff:
      'border border-[var(--color-sport-swim-border)] text-[var(--color-sport-swim)]/75 hover:bg-[var(--color-sport-swim-bg)]',
    controlOn:
      'border-[var(--color-sport-swim)] bg-[color-mix(in_oklab,var(--color-sport-swim)_18%,white)] text-[var(--color-sport-swim)]',
    unitAccent: 'text-[var(--color-sport-swim)] hover:bg-[var(--color-sport-swim-bg)]',
    section: 'bg-[var(--color-sport-swim-bg)] hover:bg-[color-mix(in_oklab,var(--color-sport-swim)_12%,white)]',
    sectionText: 'text-[var(--color-sport-swim)]',
    focus: 'data-[state=open]:border-[var(--color-sport-swim)]',
    heroGradient: 'from-white to-[var(--color-sport-swim-bg)]',
  },
  STRENGTH: {
    card: 'border-[var(--color-sport-strength-border)] bg-[var(--color-sport-strength-bg)]',
    iconWrap:
      'bg-[color-mix(in_oklab,var(--color-sport-strength)_20%,white)] text-[var(--color-sport-strength)]',
    chipOn:
      'bg-[color-mix(in_oklab,var(--color-sport-strength)_22%,white)] text-[var(--color-sport-strength)]',
    chipOff:
      'border border-[var(--color-sport-strength-border)] text-[var(--color-sport-strength)]/75 hover:bg-[var(--color-sport-strength-bg)]',
    controlOn:
      'border-[var(--color-sport-strength)] bg-[color-mix(in_oklab,var(--color-sport-strength)_18%,white)] text-[var(--color-sport-strength)]',
    unitAccent: 'text-[var(--color-sport-strength)] hover:bg-[var(--color-sport-strength-bg)]',
    section:
      'bg-[var(--color-sport-strength-bg)] hover:bg-[color-mix(in_oklab,var(--color-sport-strength)_12%,white)]',
    sectionText: 'text-[var(--color-sport-strength)]',
    focus: 'data-[state=open]:border-[var(--color-sport-strength)]',
    heroGradient: 'from-white to-[var(--color-sport-strength-bg)]',
  },
  HYROX: {
    card: 'border-[var(--color-sport-hyrox-border)] bg-[var(--color-sport-hyrox-bg)]',
    iconWrap: 'bg-[color-mix(in_oklab,var(--color-sport-hyrox)_20%,white)] text-[var(--color-sport-hyrox)]',
    chipOn: 'bg-[color-mix(in_oklab,var(--color-sport-hyrox)_22%,white)] text-[var(--color-sport-hyrox)]',
    chipOff:
      'border border-[var(--color-sport-hyrox-border)] text-[var(--color-sport-hyrox)]/75 hover:bg-[var(--color-sport-hyrox-bg)]',
    controlOn:
      'border-[var(--color-sport-hyrox)] bg-[color-mix(in_oklab,var(--color-sport-hyrox)_18%,white)] text-[var(--color-sport-hyrox)]',
    unitAccent: 'text-[var(--color-sport-hyrox)] hover:bg-[var(--color-sport-hyrox-bg)]',
    section: 'bg-[var(--color-sport-hyrox-bg)] hover:bg-[color-mix(in_oklab,var(--color-sport-hyrox)_12%,white)]',
    sectionText: 'text-[var(--color-sport-hyrox)]',
    focus: 'data-[state=open]:border-[var(--color-sport-hyrox)]',
    heroGradient: 'from-white to-[var(--color-sport-hyrox-bg)]',
  },
  TRIATHLON: {
    card: 'border-[var(--color-sport-tri-border)] bg-[var(--color-sport-tri-bg)]',
    iconWrap: 'bg-[color-mix(in_oklab,var(--color-sport-tri)_20%,white)] text-[var(--color-sport-tri)]',
    chipOn: 'bg-[color-mix(in_oklab,var(--color-sport-tri)_22%,white)] text-[var(--color-sport-tri)]',
    chipOff:
      'border border-[var(--color-sport-tri-border)] text-[var(--color-sport-tri)]/75 hover:bg-[var(--color-sport-tri-bg)]',
    controlOn:
      'border-[var(--color-sport-tri)] bg-[color-mix(in_oklab,var(--color-sport-tri)_18%,white)] text-[var(--color-sport-tri)]',
    unitAccent: 'text-[var(--color-sport-tri)] hover:bg-[var(--color-sport-tri-bg)]',
    section: 'bg-[var(--color-sport-tri-bg)] hover:bg-[color-mix(in_oklab,var(--color-sport-tri)_12%,white)]',
    sectionText: 'text-[var(--color-sport-tri)]',
    focus: 'data-[state=open]:border-[var(--color-sport-tri)]',
    heroGradient: 'from-white to-[var(--color-sport-tri-bg)]',
  },
  RECOVERY: {
    card: 'border-[var(--color-sport-recovery-border)] bg-[var(--color-sport-recovery-bg)]',
    iconWrap:
      'bg-[color-mix(in_oklab,var(--color-sport-recovery)_20%,white)] text-[var(--color-sport-recovery)]',
    chipOn:
      'bg-[color-mix(in_oklab,var(--color-sport-recovery)_22%,white)] text-[var(--color-sport-recovery)]',
    chipOff:
      'border border-[var(--color-sport-recovery-border)] text-[var(--color-sport-recovery)]/75 hover:bg-[var(--color-sport-recovery-bg)]',
    controlOn:
      'border-[var(--color-sport-recovery)] bg-[color-mix(in_oklab,var(--color-sport-recovery)_18%,white)] text-[var(--color-sport-recovery)]',
    unitAccent: 'text-[var(--color-sport-recovery)] hover:bg-[var(--color-sport-recovery-bg)]',
    section:
      'bg-[var(--color-sport-recovery-bg)] hover:bg-[color-mix(in_oklab,var(--color-sport-recovery)_12%,white)]',
    sectionText: 'text-[var(--color-sport-recovery)]',
    focus: 'data-[state=open]:border-[var(--color-sport-recovery)]',
    heroGradient: 'from-white to-[var(--color-sport-recovery-bg)]',
  },
  REST: {
    card: 'border-[var(--color-sport-rest-border)] bg-[var(--color-sport-rest-bg)]',
    iconWrap: 'bg-[color-mix(in_oklab,var(--color-sport-rest)_20%,white)] text-[var(--color-sport-rest)]',
    chipOn: 'bg-[color-mix(in_oklab,var(--color-sport-rest)_22%,white)] text-[var(--color-sport-rest)]',
    chipOff:
      'border border-[var(--color-sport-rest-border)] text-[var(--color-sport-rest)]/75 hover:bg-[var(--color-sport-rest-bg)]',
    controlOn:
      'border-[var(--color-sport-rest)] bg-[color-mix(in_oklab,var(--color-sport-rest)_18%,white)] text-[var(--color-sport-rest)]',
    unitAccent: 'text-[var(--color-sport-rest)] hover:bg-[var(--color-sport-rest-bg)]',
    section: 'bg-[var(--color-sport-rest-bg)] hover:bg-[color-mix(in_oklab,var(--color-sport-rest)_12%,white)]',
    sectionText: 'text-[var(--color-sport-rest)]',
    focus: 'data-[state=open]:border-[var(--color-sport-rest)]',
    heroGradient: 'from-white to-[var(--color-sport-rest-bg)]',
  },
}

export function getWorkoutEditorSportTheme(sport: WorkoutType): WorkoutEditorSportTheme {
  return THEMES[sport]
}

/** Modal / detail hero wash — always from globals sport palette. */
export function getSportHeroGradientClass(sport: WorkoutType): string {
  return THEMES[sport].heroGradient
}
