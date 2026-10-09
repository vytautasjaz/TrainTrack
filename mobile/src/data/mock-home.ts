import type { SportId } from '@/theme/tokens'

export type WorkoutStatus = 'planned' | 'completed' | 'skipped'

export type StructureBlock = {
  label: string
  detail: string
}

/** Shared shape for Today cards, Upcoming rows, and the detail modal. */
export type WorkoutDetail = {
  id: string
  sport: SportId
  title: string
  description: string
  dateLabel: string
  metric: string
  zone?: string
  sessionType?: string
  status: WorkoutStatus
  actualMetric?: string
  plannedMetric?: string
  actualSecondary?: string
  plannedSecondary?: string
  pace?: string
  coachNotes?: string
  structure?: StructureBlock[]
}

export type TodayWorkout = WorkoutDetail

export type UpcomingWorkout = WorkoutDetail & {
  weekday: string
  dateNum: string
  month: string
  prescription: string
}

/** Static draft data — mirrors web athlete home mobile content. */
export const DRAFT_ATHLETE_NAME = 'Vytautas'
export const DRAFT_GREETING = 'Good afternoon'

export const DRAFT_TODAY: TodayWorkout[] = [
  {
    id: 'today-1',
    sport: 'run',
    title: 'Easy Run',
    description: 'Keep it conversational.\nFlat route · cadence relaxed',
    dateLabel: 'Fri 25 Sep 2026',
    metric: '10 km',
    zone: 'Z2',
    sessionType: 'Easy',
    status: 'completed',
    actualMetric: '10.2 km',
    plannedMetric: '10 km',
    actualSecondary: '52:08',
    plannedSecondary: '50:00',
    pace: '5:07',
    coachNotes: 'Great aerobic day — stay easy tomorrow before the long run.',
    structure: [
      { label: 'Warm-up', detail: '1.5 km · easy' },
      { label: 'Main set', detail: '7 km · Z2' },
      { label: 'Cool-down', detail: '1.5 km · easy' },
    ],
  },
  {
    id: 'today-2',
    sport: 'strength',
    title: 'Upper Body',
    description: 'Pull · push · core\n3 rounds · controlled tempo',
    dateLabel: 'Fri 25 Sep 2026',
    metric: '45 min',
    sessionType: 'Strength',
    status: 'planned',
    coachNotes: 'Keep shoulders down on pull-ups. Stop 1–2 reps short of failure.',
    structure: [
      { label: 'Warm-up', detail: '5 min · band + scap work' },
      { label: 'Circuit', detail: '3 rounds · pull · push · core' },
      { label: 'Finisher', detail: 'Face pulls · 2×15' },
    ],
  },
]

export const DRAFT_UPCOMING: UpcomingWorkout[] = [
  {
    id: 'up-1',
    weekday: 'Sat',
    dateNum: '26',
    month: 'Sep',
    sport: 'run',
    title: 'Long run',
    prescription: '18 km · easy + strides',
    description: 'Easy effort most of the way.\nFinish with 4×20s strides.',
    dateLabel: 'Sat 26 Sep 2026',
    metric: '18 km',
    zone: 'Z2',
    sessionType: 'Long',
    status: 'planned',
    coachNotes: 'Fuel early. If legs feel heavy after 12k, shorten and keep quality.',
    structure: [
      { label: 'Easy', detail: '16 km · Z2' },
      { label: 'Strides', detail: '4 × 20s · full recovery' },
      { label: 'Cool-down', detail: '2 km · easy' },
    ],
  },
  {
    id: 'up-2',
    weekday: 'Sun',
    dateNum: '27',
    month: 'Sep',
    sport: 'bike',
    title: 'Recovery spin',
    prescription: '45 min · Z1–Z2',
    description: 'Spin easy. Cadence high, power low.',
    dateLabel: 'Sun 27 Sep 2026',
    metric: '45 min',
    zone: 'Z1–Z2',
    sessionType: 'Recovery',
    status: 'planned',
    structure: [
      { label: 'Spin', detail: '45 min · Z1–Z2' },
    ],
  },
  {
    id: 'up-3',
    weekday: 'Mon',
    dateNum: '28',
    month: 'Sep',
    sport: 'run',
    title: 'Easy run',
    prescription: '10 km · Z2',
    description: 'Shakeout after the weekend. Keep it smooth.',
    dateLabel: 'Mon 28 Sep 2026',
    metric: '10 km',
    zone: 'Z2',
    sessionType: 'Easy',
    status: 'planned',
  },
  {
    id: 'up-4',
    weekday: 'Tue',
    dateNum: '29',
    month: 'Sep',
    sport: 'swim',
    title: 'Technique swim',
    prescription: '2.0 km · drills',
    description: 'Focus on catch and timing.\nDrills first, then aerobic freestyle.',
    dateLabel: 'Tue 29 Sep 2026',
    metric: '2.0 km',
    sessionType: 'Technique',
    status: 'planned',
    structure: [
      { label: 'Warm-up', detail: '400 m · easy' },
      { label: 'Drills', detail: '8 × 50 m · catch-up / fist' },
      { label: 'Main', detail: '1.0 km · aerobic' },
      { label: 'Cool-down', detail: '200 m · easy' },
    ],
  },
]
