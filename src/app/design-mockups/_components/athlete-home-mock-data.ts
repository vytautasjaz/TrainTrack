import type { TrainingSport } from './training-mock-data'
import type { PrescriptionWorkout } from './prescription-workout-card'

export type AthleteHomeUpcomingRow = {
  weekday: string
  dateNum: string
  month: string
  sport: TrainingSport
  title: string
  prescription: string
  weather: { morning: string; day: string; evening: string }
  /** Optional status for past-week rows */
  status?: 'done' | 'skipped' | 'planned'
}

export const ATHLETE_HOME_TODAY: PrescriptionWorkout[] = [
  {
    id: 'home-easy',
    sport: 'run',
    title: 'Easy Run',
    prescription: '10 km · Z2',
    metric: '10 km',
    zone: 'Z2',
    status: 'done',
    completionPercent: 102,
    actualMetric: '10.2 km',
    actualSecondary: '52:08',
  },
  {
    id: 'home-strength',
    sport: 'strength',
    title: 'Upper Body',
    prescription: 'Pull · push · core · 3 rounds',
    metric: '45 min',
    status: 'planned',
  },
  {
    id: 'home-recovery',
    sport: 'recovery',
    title: 'Recovery Flow',
    prescription: 'Hips · T-spine · breath-led',
    metric: '20 min',
    status: 'planned',
  },
]

/** Earlier this week / still ahead before weekend */
export const ATHLETE_HOME_UPCOMING_THIS_WEEK: AthleteHomeUpcomingRow[] = [
  {
    weekday: 'Fri',
    dateNum: '21',
    month: 'Aug',
    sport: 'run',
    title: 'Strides + drills',
    prescription: '8 km · 6 × 20″ strides',
    weather: { morning: '17°', day: '21°', evening: '16°' },
  },
  {
    weekday: 'Sat',
    dateNum: '22',
    month: 'Aug',
    sport: 'bike',
    title: 'Long Ride',
    prescription: '80 km · Z2',
    weather: { morning: '18°', day: '22°', evening: '17°' },
  },
  {
    weekday: 'Sun',
    dateNum: '23',
    month: 'Aug',
    sport: 'swim',
    title: 'Swim Easy',
    prescription: '2.0 km · technique',
    weather: { morning: '16°', day: '20°', evening: '15°' },
  },
]

export const ATHLETE_HOME_NEXT_WEEK: AthleteHomeUpcomingRow[] = [
  {
    weekday: 'Mon',
    dateNum: '25',
    month: 'Aug',
    sport: 'run',
    title: 'Threshold Intervals',
    prescription: '3 × 2 km @ Threshold',
    weather: { morning: '15°', day: '19°', evening: '14°' },
  },
  {
    weekday: 'Tue',
    dateNum: '26',
    month: 'Aug',
    sport: 'strength',
    title: 'Full body',
    prescription: '45 min · gym',
    weather: { morning: '14°', day: '18°', evening: '13°' },
  },
  {
    weekday: 'Wed',
    dateNum: '27',
    month: 'Aug',
    sport: 'bike',
    title: 'Sweet Spot',
    prescription: '2 × 20 min @ 88% FTP',
    weather: { morning: '14°', day: '17°', evening: '12°' },
  },
  {
    weekday: 'Thu',
    dateNum: '28',
    month: 'Aug',
    sport: 'run',
    title: 'Easy Aerobic',
    prescription: '12 km · Z2',
    weather: { morning: '13°', day: '16°', evening: '12°' },
  },
  {
    weekday: 'Fri',
    dateNum: '29',
    month: 'Aug',
    sport: 'swim',
    title: 'CSS set',
    prescription: '8 × 100 @ CSS + 20″',
    weather: { morning: '13°', day: '17°', evening: '12°' },
  },
  {
    weekday: 'Sat',
    dateNum: '30',
    month: 'Aug',
    sport: 'run',
    title: 'Long Run',
    prescription: '22 km · progressive',
    weather: { morning: '12°', day: '18°', evening: '13°' },
  },
  {
    weekday: 'Sun',
    dateNum: '31',
    month: 'Aug',
    sport: 'recovery',
    title: 'Mobility + walk',
    prescription: '40 min · easy',
    weather: { morning: '12°', day: '17°', evening: '12°' },
  },
]

/** Last week — completed / skipped for richer home context */
export const ATHLETE_HOME_LAST_WEEK: AthleteHomeUpcomingRow[] = [
  {
    weekday: 'Mon',
    dateNum: '11',
    month: 'Aug',
    sport: 'run',
    title: 'Easy Run',
    prescription: '10 km · Z2',
    weather: { morning: '16°', day: '22°', evening: '17°' },
    status: 'done',
  },
  {
    weekday: 'Tue',
    dateNum: '12',
    month: 'Aug',
    sport: 'bike',
    title: 'Endurance',
    prescription: '90 min · Z2',
    weather: { morning: '15°', day: '21°', evening: '16°' },
    status: 'done',
  },
  {
    weekday: 'Wed',
    dateNum: '13',
    month: 'Aug',
    sport: 'swim',
    title: 'Pull focus',
    prescription: '2.4 km · paddles',
    weather: { morning: '15°', day: '20°', evening: '15°' },
    status: 'done',
  },
  {
    weekday: 'Thu',
    dateNum: '14',
    month: 'Aug',
    sport: 'run',
    title: 'Hills',
    prescription: '8 × 90″ @ 5k effort',
    weather: { morning: '14°', day: '19°', evening: '14°' },
    status: 'skipped',
  },
  {
    weekday: 'Fri',
    dateNum: '15',
    month: 'Aug',
    sport: 'strength',
    title: 'Lower body',
    prescription: '40 min · gym',
    weather: { morning: '14°', day: '20°', evening: '15°' },
    status: 'done',
  },
  {
    weekday: 'Sat',
    dateNum: '16',
    month: 'Aug',
    sport: 'bike',
    title: 'Group ride',
    prescription: '70 km · mixed',
    weather: { morning: '15°', day: '23°', evening: '17°' },
    status: 'done',
  },
  {
    weekday: 'Sun',
    dateNum: '17',
    month: 'Aug',
    sport: 'run',
    title: 'Long Run',
    prescription: '18 km · Z2',
    weather: { morning: '14°', day: '21°', evening: '16°' },
    status: 'done',
  },
]

export const ATHLETE_HOME_RACES = [
  {
    nameLead: 'Vilnius',
    nameAccent: 'Half Marathon',
    date: '12 Sep 2025',
    days: 23,
    place: 'Vilnius, LT',
  },
  {
    nameLead: 'Kaunas',
    nameAccent: 'Marathon',
    date: '18 Oct 2025',
    days: 59,
    place: 'Kaunas, LT',
  },
  {
    nameLead: 'Druskininkai',
    nameAccent: '10K',
    date: '2 Nov 2025',
    days: 74,
    place: 'Druskininkai, LT',
  },
  {
    nameLead: 'Ironman',
    nameAccent: '70.3 Tallinn',
    date: '5 Jul 2026',
    days: 319,
    place: 'Tallinn, EE',
  },
  {
    nameLead: 'Berlin',
    nameAccent: 'Marathon',
    date: '27 Sep 2026',
    days: 403,
    place: 'Berlin, DE',
  },
] as const
