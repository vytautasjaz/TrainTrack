export type TrainingSport = 'run' | 'bike' | 'swim' | 'strength' | 'recovery'

export type TrainingStatus = 'planned' | 'done' | 'skipped'

export type TrainingWorkout = {
  id: string
  sport: TrainingSport
  title: string
  /** Hero metric line (legacy / chip fallback) */
  meta: string
  /** Prescription-first card copy */
  prescription?: string
  recoveryLine?: string
  prescriptionMetric?: string
  zone?: string
  include?: string
  actualMetric?: string
  actualSecondary?: string
  /** Estimated duration shown on week blocks */
  estimatedDuration?: string
  /**
   * Compact structure sketch for week matrix (intensity 0–1, weight = relative width).
   * Week view only — not used on Home/List cards.
   */
  structureBars?: { weight: number; intensity: number }[]
  status: TrainingStatus
  /** Day index Mon=0 … Sun=6 */
  dayIndex: number
  selfAdded?: boolean
  reschedule?: boolean
  strava?: boolean
  race?: boolean
  /** 0–100 · how much of the planned session was completed (rail fill) */
  completionPercent?: number
}

export type DayWeather = {
  morning: string
  day: string
  evening: string
  /** Meteocon / Yr glyph keys used by WeatherGlyph */
  morningGlyph?: string
  dayGlyph?: string
  eveningGlyph?: string
  /** Optional precip line under temp (e.g. `40%`, `1.2mm`) */
  morningPrecip?: string
  dayPrecip?: string
  eveningPrecip?: string
}

export type TrainingDay = {
  dayIndex: number
  label: string
  short: string
  /** Full weekday for week header · Monday */
  weekday: string
  dateNum: number
  today: boolean
  note?: string
  recovery?: boolean
  weather?: DayWeather
  race?: string
  /** Season / race event chip for Events row */
  event?: string
}

/** Week of Mon 17 Aug 2026 · today Fri 21 Aug */
export const TRAINING_WEEK_LABEL = '17–23 Aug 2026'
export const TRAINING_ATHLETE = 'Ieva Kazlauskaitė'
export const TRAINING_SELF = 'Vytautas'

export const TRAINING_DAYS: TrainingDay[] = [
  {
    dayIndex: 0,
    label: 'Mon 17 Aug',
    short: 'Mon',
    weekday: 'Monday',
    dateNum: 17,
    today: false,
    weather: {
      morning: '16°',
      day: '19°',
      evening: '14°',
      morningGlyph: 'partly-cloudy-day',
      dayGlyph: 'partly-cloudy-day',
      eveningGlyph: 'partly-cloudy-night',
    },
  },
  {
    dayIndex: 1,
    label: 'Tue 18 Aug',
    short: 'Tue',
    weekday: 'Tuesday',
    dateNum: 18,
    today: false,
    weather: {
      morning: '17°',
      day: '21°',
      evening: '15°',
      morningGlyph: 'clear-day',
      dayGlyph: 'clear-day',
      eveningGlyph: 'clear-night',
    },
    note: 'Travel morning',
  },
  {
    dayIndex: 2,
    label: 'Wed 19 Aug',
    short: 'Wed',
    weekday: 'Wednesday',
    dateNum: 19,
    today: false,
    weather: {
      morning: '18°',
      day: '22°',
      evening: '16°',
      morningGlyph: 'cloudy',
      dayGlyph: 'partly-cloudy-day',
      eveningGlyph: 'cloudy',
    },
  },
  {
    dayIndex: 3,
    label: 'Thu 20 Aug',
    short: 'Thu',
    weekday: 'Thursday',
    dateNum: 20,
    today: false,
    weather: {
      morning: '17°',
      day: '20°',
      evening: '15°',
      morningGlyph: 'drizzle',
      dayGlyph: 'rain',
      eveningGlyph: 'cloudy',
      morningPrecip: '40%',
      dayPrecip: '70%',
      eveningPrecip: '20%',
    },
  },
  {
    dayIndex: 4,
    label: 'Fri 21 Aug',
    short: 'Fri',
    weekday: 'Friday',
    dateNum: 21,
    today: true,
    weather: {
      morning: '15°',
      day: '18°',
      evening: '14°',
      morningGlyph: 'partly-cloudy-day',
      dayGlyph: 'partly-cloudy-day',
      eveningGlyph: 'partly-cloudy-night',
    },
    note: 'Race week taper note',
  },
  {
    dayIndex: 5,
    label: 'Sat 22 Aug',
    short: 'Sat',
    weekday: 'Saturday',
    dateNum: 22,
    today: false,
    weather: {
      morning: '14°',
      day: '17°',
      evening: '13°',
      morningGlyph: 'rain',
      dayGlyph: 'rain',
      eveningGlyph: 'drizzle',
      morningPrecip: '80%',
      dayPrecip: '2.1mm',
      eveningPrecip: '50%',
    },
    recovery: true,
  },
  {
    dayIndex: 6,
    label: 'Sun 23 Aug',
    short: 'Sun',
    weekday: 'Sunday',
    dateNum: 23,
    today: false,
    weather: {
      morning: '13°',
      day: '16°',
      evening: '12°',
      morningGlyph: 'clear-day',
      dayGlyph: 'clear-day',
      eveningGlyph: 'clear-night',
    },
    race: 'Local 10K',
    event: 'Local 10K',
    note: 'Packet pickup 7:30',
  },
]

export const TRAINING_WORKOUTS: TrainingWorkout[] = [
  {
    id: 'w-mon-run',
    sport: 'run',
    title: 'Easy Run',
    meta: '8.1 km · 46 min',
    prescription: '8 km · Z2',
    prescriptionMetric: '8 km',
    zone: 'Z2',
    estimatedDuration: '~46 min',
    structureBars: [
      { weight: 1, intensity: 0.35 },
      { weight: 6, intensity: 0.42 },
      { weight: 1, intensity: 0.28 },
    ],
    status: 'done',
    dayIndex: 0,
    strava: true,
    completionPercent: 100,
    actualMetric: '8.1 km',
    actualSecondary: '46:12',
  },
  {
    id: 'w-mon-swim',
    sport: 'swim',
    title: 'Technique',
    meta: '2.0 km',
    prescription: '8 × 100 m aerobic · 20s rest',
    prescriptionMetric: '2.0 km',
    estimatedDuration: '~45 min',
    structureBars: [
      { weight: 1, intensity: 0.3 },
      { weight: 1.2, intensity: 0.55 },
      { weight: 0.4, intensity: 0.25 },
      { weight: 1.2, intensity: 0.55 },
      { weight: 0.4, intensity: 0.25 },
      { weight: 1.2, intensity: 0.55 },
      { weight: 0.4, intensity: 0.25 },
      { weight: 1.2, intensity: 0.55 },
      { weight: 0.4, intensity: 0.25 },
      { weight: 1, intensity: 0.3 },
    ],
    status: 'done',
    dayIndex: 0,
    completionPercent: 85,
    actualMetric: '1.7 km',
  },
  {
    id: 'w-tue-bike',
    sport: 'bike',
    title: 'Long Ride',
    meta: '68 km · 2h 04m',
    prescription: '70 km · Z2',
    prescriptionMetric: '70 km',
    zone: 'Z2',
    estimatedDuration: '~2:10 h',
    structureBars: [
      { weight: 1, intensity: 0.3 },
      { weight: 8, intensity: 0.45 },
      { weight: 1, intensity: 0.28 },
    ],
    status: 'done',
    dayIndex: 1,
    strava: true,
    completionPercent: 92,
    actualMetric: '68 km',
    actualSecondary: '2:04',
  },
  {
    id: 'w-wed-run',
    sport: 'run',
    title: 'VO2 Intervals',
    meta: '6×800 · Z4',
    prescription: '6 × 800 m @ VO2',
    recoveryLine: "90\" easy recovery",
    prescriptionMetric: '8 km',
    zone: 'Z5',
    estimatedDuration: '~52 min',
    structureBars: [
      { weight: 1.5, intensity: 0.35 },
      { weight: 1, intensity: 0.92 },
      { weight: 0.6, intensity: 0.28 },
      { weight: 1, intensity: 0.92 },
      { weight: 0.6, intensity: 0.28 },
      { weight: 1, intensity: 0.92 },
      { weight: 0.6, intensity: 0.28 },
      { weight: 1, intensity: 0.92 },
      { weight: 0.6, intensity: 0.28 },
      { weight: 1, intensity: 0.92 },
      { weight: 0.6, intensity: 0.28 },
      { weight: 1, intensity: 0.92 },
      { weight: 1.2, intensity: 0.3 },
    ],
    status: 'skipped',
    dayIndex: 2,
    reschedule: true,
  },
  {
    id: 'w-wed-strength',
    sport: 'strength',
    title: 'Full body',
    meta: '45 min',
    prescription: 'Pull · push · core · 3 rounds',
    prescriptionMetric: '45 min',
    estimatedDuration: '45 min',
    status: 'done',
    dayIndex: 2,
    completionPercent: 70,
    actualMetric: '45 min',
  },
  {
    id: 'w-thu-run',
    sport: 'run',
    title: 'Easy Run',
    meta: '10.2 km · 52 min',
    prescription: '10 km · Z2',
    prescriptionMetric: '10 km',
    zone: 'Z2',
    estimatedDuration: '~52 min',
    structureBars: [
      { weight: 1, intensity: 0.35 },
      { weight: 7, intensity: 0.42 },
      { weight: 1, intensity: 0.28 },
    ],
    status: 'done',
    dayIndex: 3,
    strava: true,
    completionPercent: 100,
    actualMetric: '10.2 km',
    actualSecondary: '52:08',
  },
  {
    id: 'w-thu-strength',
    sport: 'strength',
    title: 'Upper body',
    meta: '45 min',
    prescription: 'Press · rows · arms',
    prescriptionMetric: '45 min',
    estimatedDuration: '45 min',
    status: 'done',
    dayIndex: 3,
    completionPercent: 55,
    actualMetric: '45 min',
  },
  {
    id: 'w-fri-run',
    sport: 'run',
    title: 'Threshold Intervals',
    meta: '12 km · Z3',
    prescription: '3 × 2 km @ 4:05/km',
    recoveryLine: "2' easy recovery",
    prescriptionMetric: '12 km',
    zone: 'Z3',
    include: '6 × 100 m strides',
    estimatedDuration: '~48 min',
    structureBars: [
      { weight: 1.5, intensity: 0.35 },
      { weight: 2.2, intensity: 0.78 },
      { weight: 0.7, intensity: 0.3 },
      { weight: 2.2, intensity: 0.78 },
      { weight: 0.7, intensity: 0.3 },
      { weight: 2.2, intensity: 0.78 },
      { weight: 1.2, intensity: 0.32 },
    ],
    status: 'planned',
    dayIndex: 4,
  },
  {
    id: 'w-fri-swim',
    sport: 'swim',
    title: 'Aerobic',
    meta: '1.5 km',
    prescription: '1.5 km continuous · easy',
    prescriptionMetric: '1.5 km',
    estimatedDuration: '~32 min',
    structureBars: [
      { weight: 1, intensity: 0.3 },
      { weight: 5, intensity: 0.48 },
      { weight: 1, intensity: 0.28 },
    ],
    status: 'planned',
    dayIndex: 4,
  },
  {
    id: 'w-sat-rec',
    sport: 'recovery',
    title: 'Mobility',
    meta: '30 min',
    prescription: 'Hips · T-spine · ankles',
    prescriptionMetric: '30 min',
    estimatedDuration: '30 min',
    status: 'planned',
    dayIndex: 5,
  },
  {
    id: 'w-sun-race',
    sport: 'run',
    title: 'Local 10K',
    meta: 'Race · goal 42',
    prescription: '10 km · race pace',
    prescriptionMetric: '10 km',
    estimatedDuration: '~42 min',
    status: 'planned',
    dayIndex: 6,
    race: true,
  },
]

export const TRAINING_SPORT_ROWS: {
  id: TrainingSport
  name: string
  color: string
  /** Planned week distance; null when sport has no distance. */
  weekDistancePlanned: string | null
  /** Completed week distance so far (null = none logged yet). */
  weekDistanceActual: string | null
  weekDurationPlanned: string
  weekDurationActual: string | null
}[] = [
  {
    id: 'run',
    name: 'Run',
    color: 'var(--tt-sport-run)',
    weekDistancePlanned: '48.3 km',
    weekDistanceActual: '24.8 km',
    weekDurationPlanned: '3h 18m',
    weekDurationActual: '1h 52m',
  },
  {
    id: 'bike',
    name: 'Bike',
    color: 'var(--tt-sport-bike)',
    weekDistancePlanned: '68 km',
    weekDistanceActual: '68 km',
    weekDurationPlanned: '2h 04m',
    weekDurationActual: '2h 08m',
  },
  {
    id: 'swim',
    name: 'Swim',
    color: 'var(--tt-sport-swim)',
    weekDistancePlanned: '3.2 km',
    weekDistanceActual: '2.1 km',
    weekDurationPlanned: '1h 17m',
    weekDurationActual: '48m',
  },
  {
    id: 'strength',
    name: 'Strength',
    color: 'var(--tt-sport-strength)',
    weekDistancePlanned: null,
    weekDistanceActual: null,
    weekDurationPlanned: '1h 30m',
    weekDurationActual: '1h 28m',
  },
  {
    id: 'recovery',
    name: 'Recovery',
    color: 'var(--tt-sport-recovery)',
    weekDistancePlanned: null,
    weekDistanceActual: null,
    weekDurationPlanned: '30 min',
    weekDurationActual: null,
  },
]

/** Weekly volume: completed / planned duration. */
export const TRAINING_WEEK_VOLUME_PLANNED = '8h 39m'
export const TRAINING_WEEK_VOLUME_ACTUAL = '6h 16m'
/** @deprecated use planned/actual pair */
export const TRAINING_WEEK_VOLUME = TRAINING_WEEK_VOLUME_PLANNED

export type LibraryFolder = {
  id: string
  /** Sport this folder belongs to — folders are per-sport topic groups */
  sport: TrainingSport
  name: string
}

export type LibraryTemplate = {
  id: string
  sport: TrainingSport
  title: string
  meta: string
  /** Session type label shown on library cards */
  sessionType?: string
  /** Structured builder vs plain text */
  kind?: 'structured' | 'text'
  /** Short prescription / description */
  description?: string
  updated?: string
  /** Topic folder within the sport; null/undefined = Unfiled */
  folderId?: string | null
}

/** Coach-created topic folders (per sport). */
export const LIBRARY_FOLDERS: LibraryFolder[] = [
  { id: 'f-run-threshold', sport: 'run', name: 'Threshold' },
  { id: 'f-run-long', sport: 'run', name: 'Long Runs' },
  { id: 'f-run-yee', sport: 'run', name: 'Alex Yee training' },
  { id: 'f-run-easy', sport: 'run', name: 'Easy / recovery' },
  { id: 'f-bike-ss', sport: 'bike', name: 'Sweet spot' },
  { id: 'f-bike-endurance', sport: 'bike', name: 'Endurance' },
  { id: 'f-swim-css', sport: 'swim', name: 'CSS / threshold' },
  { id: 'f-swim-tech', sport: 'swim', name: 'Technique' },
  { id: 'f-str-gym', sport: 'strength', name: 'Gym' },
]

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  {
    id: 't1',
    sport: 'run',
    title: 'Tempo 8k',
    meta: '8 km · ~42 min',
    sessionType: 'Tempo',
    kind: 'structured',
    description: '2 km easy · 8 km @ threshold · 1 km cool-down',
    updated: '12 Aug 2026',
    folderId: 'f-run-threshold',
  },
  {
    id: 't2',
    sport: 'run',
    title: 'VO2 5×3′',
    meta: 'Track · ~48 min',
    sessionType: 'Intervals',
    kind: 'structured',
    description: 'WU · 5 × 3′ @ VO2 · 2′ jog · CD',
    updated: '8 Aug 2026',
    folderId: 'f-run-yee',
  },
  {
    id: 't11',
    sport: 'run',
    title: 'Yee threshold 4×2k',
    meta: '12 km · ~52 min',
    sessionType: 'Threshold',
    kind: 'structured',
    description: 'WU · 4 × 2 km @ LT · 90″ jog · CD',
    updated: '15 Aug 2026',
    folderId: 'f-run-yee',
  },
  {
    id: 't12',
    sport: 'run',
    title: 'Race-pace 3×1k',
    meta: 'Track · ~40 min',
    sessionType: 'Intervals',
    kind: 'structured',
    description: 'WU · 3 × 1 km race pace · 3′ · CD',
    updated: '11 Aug 2026',
    folderId: 'f-run-yee',
  },
  {
    id: 't3',
    sport: 'run',
    title: 'Long 18k',
    meta: '18 km · ~1h 45m',
    sessionType: 'Long Run',
    kind: 'structured',
    description: 'Steady Z2 · last 3 km slightly up',
    updated: '3 Aug 2026',
    folderId: 'f-run-long',
  },
  {
    id: 't13',
    sport: 'run',
    title: 'Long 22k progressive',
    meta: '22 km · ~2h',
    sessionType: 'Long Run',
    kind: 'structured',
    description: 'First 15 easy · last 7 build to Z3',
    updated: '19 Aug 2026',
    folderId: 'f-run-long',
  },
  {
    id: 't10',
    sport: 'run',
    title: 'Easy shakeout',
    meta: '8 km · ~45 min',
    sessionType: 'Easy Run',
    kind: 'text',
    description: 'Conversational pace. Strides optional.',
    updated: '28 Jul 2026',
    folderId: 'f-run-easy',
  },
  {
    id: 't14',
    sport: 'run',
    title: 'Cruise intervals 6×1k',
    meta: '14 km · ~58 min',
    sessionType: 'Threshold',
    kind: 'structured',
    description: 'WU · 6 × 1 km @ cruise · 1′ · CD',
    updated: '6 Aug 2026',
    folderId: 'f-run-threshold',
  },
  {
    id: 't15',
    sport: 'run',
    title: 'Fartlek mixed',
    meta: '10 km · ~48 min',
    sessionType: 'Fartlek',
    kind: 'text',
    description: 'Unstructured surges — feel-based',
    updated: '22 Jul 2026',
    folderId: null,
  },
  {
    id: 't4',
    sport: 'bike',
    title: 'Endurance 90',
    meta: '90 min · Z2',
    sessionType: 'Endurance',
    kind: 'structured',
    description: 'Steady endurance · cadence focus',
    updated: '10 Aug 2026',
    folderId: 'f-bike-endurance',
  },
  {
    id: 't5',
    sport: 'bike',
    title: 'Sweet spot',
    meta: '3×12 · ~75 min',
    sessionType: 'Sweet spot',
    kind: 'structured',
    description: 'WU · 3 × 12′ @ SS · 5′ easy · CD',
    updated: '5 Aug 2026',
    folderId: 'f-bike-ss',
  },
  {
    id: 't16',
    sport: 'bike',
    title: '2×20 SS',
    meta: '2×20 · ~80 min',
    sessionType: 'Sweet spot',
    kind: 'structured',
    description: 'WU · 2 × 20′ sweet spot · CD',
    updated: '16 Aug 2026',
    folderId: 'f-bike-ss',
  },
  {
    id: 't6',
    sport: 'swim',
    title: 'CSS set',
    meta: '2.4 km',
    sessionType: 'CSS',
    kind: 'structured',
    description: '400 WU · 8 × 100 CSS · 200 pull · CD',
    updated: '14 Aug 2026',
    folderId: 'f-swim-css',
  },
  {
    id: 't7',
    sport: 'swim',
    title: 'Technique',
    meta: '1.8 km',
    sessionType: 'Technique',
    kind: 'structured',
    description: 'Drill-heavy · catch-up + single-arm',
    updated: '1 Aug 2026',
    folderId: 'f-swim-tech',
  },
  {
    id: 't8',
    sport: 'strength',
    title: 'Full body',
    meta: '45 min',
    sessionType: 'Strength',
    kind: 'text',
    description: 'Squat · hinge · push · pull · core',
    updated: '20 Jul 2026',
    folderId: 'f-str-gym',
  },
  {
    id: 't9',
    sport: 'recovery',
    title: 'Mobility flow',
    meta: '25 min',
    sessionType: 'Recovery',
    kind: 'text',
    description: 'Hips, ankles, thoracic — easy range',
    updated: '18 Jul 2026',
    folderId: null,
  },
]

export function workoutsForDay(dayIndex: number) {
  return TRAINING_WORKOUTS.filter((w) => w.dayIndex === dayIndex)
}

export function workoutsForSportDay(sport: TrainingSport, dayIndex: number) {
  return TRAINING_WORKOUTS.filter((w) => w.sport === sport && w.dayIndex === dayIndex)
}

/** ——— Month calendar mock (Aug 2026 · Mon-start, close to production) ——— */

export const TRAINING_MONTH_LABEL = 'August 2026'
export const TRAINING_MONTH_TODAY_KEY = '2026-08-21'

export type MonthCalendarDay = {
  dateKey: string
  dayNumber: number
  inMonth: boolean
  isToday: boolean
  note?: string
  event?: string
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function dateKeyFromParts(y: number, m0: number, d: number) {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`
}

/** Monday-start calendar covering `monthCount` months from Aug 2026. */
export function buildMockMonthDays(monthCount: 1 | 2 | 3 = 1): MonthCalendarDay[] {
  const startYear = 2026
  const startMonth0 = 7 // August
  const endMonth0 = startMonth0 + monthCount - 1
  const endYear = startYear + Math.floor(endMonth0 / 12)
  const endM = ((endMonth0 % 12) + 12) % 12

  // First visible Monday on/before Aug 1
  const firstOfRange = new Date(Date.UTC(startYear, startMonth0, 1))
  const firstDow = (firstOfRange.getUTCDay() + 6) % 7 // Mon=0
  const gridStart = new Date(firstOfRange)
  gridStart.setUTCDate(firstOfRange.getUTCDate() - firstDow)

  // Last day of last month
  const lastOfRange = new Date(Date.UTC(endYear, endM + 1, 0))
  const lastDow = (lastOfRange.getUTCDay() + 6) % 7
  const gridEnd = new Date(lastOfRange)
  gridEnd.setUTCDate(lastOfRange.getUTCDate() + (6 - lastDow))

  const days: MonthCalendarDay[] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    const y = cursor.getUTCFullYear()
    const m0 = cursor.getUTCMonth()
    const d = cursor.getUTCDate()
    const dateKey = dateKeyFromParts(y, m0, d)
    const inMonth =
      (y > startYear || (y === startYear && m0 >= startMonth0)) &&
      (y < endYear || (y === endYear && m0 <= endM))

    days.push({
      dateKey,
      dayNumber: d,
      inMonth,
      isToday: dateKey === TRAINING_MONTH_TODAY_KEY,
      note: TRAINING_DAYS.find((td) => {
        const key = dateKeyFromParts(2026, 7, td.dateNum)
        return key === dateKey && td.note
      })?.note,
      event: TRAINING_DAYS.find((td) => {
        const key = dateKeyFromParts(2026, 7, td.dateNum)
        return key === dateKey && td.event
      })?.event,
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

export function chunkMonthWeeks(days: MonthCalendarDay[]) {
  const weeks: MonthCalendarDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

/** Map focus week (17–23 Aug) workouts + a few sparse sessions elsewhere. */
export function workoutsForMonthDate(dateKey: string): TrainingWorkout[] {
  const match = /^2026-08-(\d{2})$/.exec(dateKey)
  if (!match) return []
  const dayNum = Number(match[1])

  const focus = TRAINING_DAYS.find((d) => d.dateNum === dayNum)
  if (focus) {
    return workoutsForDay(focus.dayIndex)
  }

  // Sparse filler so the month isn't empty outside the focus week
  if (dayNum === 4) {
    return [
      {
        id: 'm-aug4-run',
        sport: 'run',
        title: 'Easy Run',
        meta: '7 km · Z2',
        prescription: '7 km · Z2',
        prescriptionMetric: '7 km',
        estimatedDuration: '~40 min',
        status: 'done',
        dayIndex: -1,
        strava: true,
        completionPercent: 100,
        actualMetric: '7.1 km',
      },
    ]
  }
  if (dayNum === 10) {
    return [
      {
        id: 'm-aug10-bike',
        sport: 'bike',
        title: 'Endurance',
        meta: '75 min · Z2',
        prescription: '75 min · Z2',
        prescriptionMetric: '75 min',
        estimatedDuration: '~75 min',
        status: 'done',
        dayIndex: -1,
        completionPercent: 100,
        actualMetric: '74 min',
      },
    ]
  }
  if (dayNum === 26) {
    return [
      {
        id: 'm-aug26-run',
        sport: 'run',
        title: 'Recovery jog',
        meta: '5 km · Z1',
        prescription: '5 km · Z1',
        prescriptionMetric: '5 km',
        estimatedDuration: '~30 min',
        status: 'planned',
        dayIndex: -1,
      },
    ]
  }
  return []
}

export type MonthWeekStat = {
  weekLabel: string
  rangeLabel: string
  completed: number
  planned: number
  sports: {
    name: string
    color: string
    actualLabel: string
    plannedLabel: string
    unit: string
    pct: number
  }[]
}

export function mockWeekStats(week: MonthCalendarDay[]): MonthWeekStat {
  const workouts = week.flatMap((d) => workoutsForMonthDate(d.dateKey))
  const planned = workouts.filter((w) => w.status !== 'skipped').length
  const completed = workouts.filter((w) => w.status === 'done').length
  const start = week[0]!
  const end = week[week.length - 1]!

  // ISO-ish week number from Monday date (Aug 2026 focus)
  const startDate = new Date(`${start.dateKey}T12:00:00`)
  const oneJan = new Date(startDate.getFullYear(), 0, 1)
  const weekNum = Math.max(
    1,
    Math.ceil(((startDate.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7),
  )

  const startMonth = start.dateKey.slice(5, 7)
  const endMonth = end.dateKey.slice(5, 7)
  const monthShort = (m: string) =>
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
      Number(m) - 1
    ]!

  const rangeLabel =
    startMonth === endMonth
      ? `${start.dayNumber} – ${end.dayNumber} ${monthShort(startMonth)}`
      : `${start.dayNumber} ${monthShort(startMonth)} – ${end.dayNumber} ${monthShort(endMonth)}`

  const isFocusWeek = week.some((d) => d.dateKey === '2026-08-17')

  const bySport = new Map<TrainingSport, TrainingWorkout[]>()
  for (const w of workouts) {
    const list = bySport.get(w.sport) ?? []
    list.push(w)
    bySport.set(w.sport, list)
  }

  const stripUnit = (value: string | null) => {
    if (!value || value === '—') return null
    const m = value.match(/^([\d.]+)\s*(.*)$/)
    if (!m) return { label: value, unit: '' }
    return { label: m[1]!, unit: m[2]?.trim() ?? '' }
  }

  const sports = TRAINING_SPORT_ROWS.filter((s) => bySport.has(s.id)).map((s) => {
    const list = bySport.get(s.id)!
    const done = list.filter((w) => w.status === 'done').length

    if (isFocusWeek) {
      const distA = stripUnit(s.weekDistanceActual)
      const distP = stripUnit(s.weekDistancePlanned)
      if (distA && distP) {
        const actual = Number(distA.label)
        const plannedVal = Number(distP.label)
        const pct =
          plannedVal > 0 ? Math.min(100, Math.round((actual / plannedVal) * 100)) : done > 0 ? 100 : 0
        return {
          name: s.name,
          color: s.color,
          actualLabel: distA.label,
          plannedLabel: distP.label,
          unit: distP.unit || distA.unit,
          pct,
        }
      }

      const durA = stripUnit(s.weekDurationActual)
      const durP = stripUnit(s.weekDurationPlanned)
      if (durA || durP) {
        // Duration strings like `1h 52m` — use workout completion as pct proxy
        const pct =
          list.length > 0 ? Math.min(100, Math.round((done / list.length) * 100)) : 0
        return {
          name: s.name,
          color: s.color,
          actualLabel: s.weekDurationActual ?? '0',
          plannedLabel: s.weekDurationPlanned,
          unit: '',
          pct,
        }
      }
    }

    const pct = list.length > 0 ? Math.min(100, Math.round((done / list.length) * 100)) : 0
    return {
      name: s.name,
      color: s.color,
      actualLabel: String(done),
      plannedLabel: String(list.length),
      unit: list.length === 1 ? 'workout' : 'workouts',
      pct,
    }
  })

  return {
    weekLabel: `Week ${weekNum}`,
    rangeLabel,
    completed,
    planned,
    sports,
  }
}

