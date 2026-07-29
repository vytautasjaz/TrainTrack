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
}

const THEMES: Record<WorkoutType, WorkoutEditorSportTheme> = {
  RUN: {
    card: 'border-orange-400/55 bg-orange-500/[0.08]',
    iconWrap: 'bg-orange-500/20 text-orange-700',
    chipOn: 'bg-orange-500/25 text-orange-800',
    chipOff: 'border border-orange-400/40 text-orange-700/75 hover:bg-orange-500/10',
    controlOn: 'border-orange-400 bg-orange-500/20 text-orange-800',
    unitAccent: 'text-orange-700 hover:bg-orange-500/15',
    section: 'bg-orange-500/[0.08] hover:bg-orange-500/[0.12]',
    sectionText: 'text-orange-800',
    focus: 'data-[state=open]:border-orange-400',
  },
  BIKE: {
    card: 'border-sky-400/55 bg-sky-500/[0.08]',
    iconWrap: 'bg-sky-500/20 text-sky-700',
    chipOn: 'bg-sky-500/25 text-sky-800',
    chipOff: 'border border-sky-400/40 text-sky-700/75 hover:bg-sky-500/10',
    controlOn: 'border-sky-400 bg-sky-500/20 text-sky-800',
    unitAccent: 'text-sky-700 hover:bg-sky-500/15',
    section: 'bg-sky-500/[0.08] hover:bg-sky-500/[0.12]',
    sectionText: 'text-sky-800',
    focus: 'data-[state=open]:border-sky-400',
  },
  SWIM: {
    card: 'border-cyan-400/55 bg-cyan-500/[0.08]',
    iconWrap: 'bg-cyan-500/20 text-cyan-700',
    chipOn: 'bg-cyan-500/25 text-cyan-800',
    chipOff: 'border border-cyan-400/40 text-cyan-700/75 hover:bg-cyan-500/10',
    controlOn: 'border-cyan-400 bg-cyan-500/20 text-cyan-800',
    unitAccent: 'text-cyan-700 hover:bg-cyan-500/15',
    section: 'bg-cyan-500/[0.08] hover:bg-cyan-500/[0.12]',
    sectionText: 'text-cyan-800',
    focus: 'data-[state=open]:border-cyan-400',
  },
  STRENGTH: {
    card: 'border-emerald-400/55 bg-emerald-500/[0.08]',
    iconWrap: 'bg-emerald-500/20 text-emerald-700',
    chipOn: 'bg-emerald-500/25 text-emerald-800',
    chipOff: 'border border-emerald-400/40 text-emerald-700/75 hover:bg-emerald-500/10',
    controlOn: 'border-emerald-400 bg-emerald-500/20 text-emerald-800',
    unitAccent: 'text-emerald-700 hover:bg-emerald-500/15',
    section: 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12]',
    sectionText: 'text-emerald-800',
    focus: 'data-[state=open]:border-emerald-400',
  },
  HYROX: {
    card: 'border-rose-400/55 bg-rose-500/[0.08]',
    iconWrap: 'bg-rose-500/20 text-rose-700',
    chipOn: 'bg-rose-500/25 text-rose-800',
    chipOff: 'border border-rose-400/40 text-rose-700/75 hover:bg-rose-500/10',
    controlOn: 'border-rose-400 bg-rose-500/20 text-rose-800',
    unitAccent: 'text-rose-700 hover:bg-rose-500/15',
    section: 'bg-rose-500/[0.08] hover:bg-rose-500/[0.12]',
    sectionText: 'text-rose-800',
    focus: 'data-[state=open]:border-rose-400',
  },
  TRIATHLON: {
    card: 'border-indigo-400/55 bg-indigo-500/[0.08]',
    iconWrap: 'bg-indigo-500/20 text-indigo-700',
    chipOn: 'bg-indigo-500/25 text-indigo-800',
    chipOff: 'border border-indigo-400/40 text-indigo-700/75 hover:bg-indigo-500/10',
    controlOn: 'border-indigo-400 bg-indigo-500/20 text-indigo-800',
    unitAccent: 'text-indigo-700 hover:bg-indigo-500/15',
    section: 'bg-indigo-500/[0.08] hover:bg-indigo-500/[0.12]',
    sectionText: 'text-indigo-800',
    focus: 'data-[state=open]:border-indigo-400',
  },
  RECOVERY: {
    card: 'border-violet-400/55 bg-violet-500/[0.08]',
    iconWrap: 'bg-violet-500/20 text-violet-700',
    chipOn: 'bg-violet-500/25 text-violet-800',
    chipOff: 'border border-violet-400/40 text-violet-700/75 hover:bg-violet-500/10',
    controlOn: 'border-violet-400 bg-violet-500/20 text-violet-800',
    unitAccent: 'text-violet-700 hover:bg-violet-500/15',
    section: 'bg-violet-500/[0.08] hover:bg-violet-500/[0.12]',
    sectionText: 'text-violet-800',
    focus: 'data-[state=open]:border-violet-400',
  },
  REST: {
    card: 'border-zinc-400/55 bg-zinc-500/[0.08]',
    iconWrap: 'bg-zinc-500/20 text-zinc-700',
    chipOn: 'bg-zinc-500/25 text-zinc-800',
    chipOff: 'border border-zinc-400/40 text-zinc-700/75 hover:bg-zinc-500/10',
    controlOn: 'border-zinc-400 bg-zinc-500/20 text-zinc-800',
    unitAccent: 'text-zinc-700 hover:bg-zinc-500/15',
    section: 'bg-zinc-500/[0.08] hover:bg-zinc-500/[0.12]',
    sectionText: 'text-zinc-800',
    focus: 'data-[state=open]:border-zinc-400',
  },
}

export function getWorkoutEditorSportTheme(sport: WorkoutType): WorkoutEditorSportTheme {
  return THEMES[sport]
}
