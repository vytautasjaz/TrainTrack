import type { CoachAthleteRow } from './coach-athletes-table'

export const COACH_MOCK_ATHLETES: CoachAthleteRow[] = [
  {
    id: 'ik',
    initials: 'IK',
    name: 'Ieva Kazlauskaitė',
    status: 'Active',
    compliance: 100,
    completed: 5,
    planned: 5,
    lastWeekCompliance: 92,
    lastWeekCompleted: 11,
    lastWeekPlanned: 12,
    nextRace: 'Ironman 70.3 · 23d',
    nextRaceDays: 23,
    warning: null,
    attention: 0,
    attentionLabel: null,
    zonesPermission: 'granted',
    activity: [
      {
        id: 'ik-m1',
        kind: 'message',
        when: 'Mon',
        title: 'You',
        from: 'coach',
        body: 'Great brick session — keep Z2 on the long ride Saturday.',
      },
      {
        id: 'ik-f1',
        kind: 'feedback',
        when: 'Sun',
        title: 'Felt strong',
        body: 'Felt good after 60 km. Slight left knee niggle at the end.',
        unread: true,
        workout: {
          title: 'Long Ride',
          date: 'Sun 17 Aug',
          sport: 'bike',
          distance: '82 km',
          duration: '3h 12m',
        },
      },
      {
        id: 'ik-f2',
        kind: 'feedback',
        when: 'Sat',
        title: 'Tough',
        body: 'Brick run legs were heavy. Kept effort honest — finished strong.',
        unread: true,
        workout: {
          title: 'Brick · Bike + Run',
          date: 'Sat 16 Aug',
          sport: 'run',
          distance: '12 km',
          duration: '1h 05m',
        },
      },
      {
        id: 'ik-f3',
        kind: 'feedback',
        when: 'Fri',
        title: 'Completed',
        body: 'Technique focus felt useful. Ready for threshold next week.',
        workout: {
          title: 'Swim Easy',
          date: 'Fri 15 Aug',
          sport: 'swim',
          distance: '2.0 km',
          duration: '42 min',
        },
      },
      {
        id: 'ik-f4',
        kind: 'feedback',
        when: 'Thu',
        title: 'Felt strong',
        body: 'Gym session clicked. Added one extra set on pull.',
        workout: {
          title: 'Strength · Full body',
          date: 'Thu 14 Aug',
          sport: 'strength',
          duration: '55 min',
        },
      },
      {
        id: 'ik-f5',
        kind: 'feedback',
        when: 'Wed',
        title: 'Ok',
        body: 'Easy spin as planned. Weather was windy on the river loop.',
        workout: {
          title: 'Recovery Ride',
          date: 'Wed 13 Aug',
          sport: 'bike',
          distance: '35 km',
          duration: '1h 20m',
        },
      },
    ],
  },
  {
    id: 'tm',
    initials: 'TM',
    name: 'Tomas Petrauskas',
    status: 'Active',
    compliance: 60,
    completed: 3,
    planned: 5,
    lastWeekCompliance: 58,
    lastWeekCompleted: 7,
    lastWeekPlanned: 12,
    nextRace: 'Vilnius Marathon · 41d',
    nextRaceDays: 41,
    warning: 'Under-planned midweek',
    attention: 2,
    attentionLabel: 'Under-planned',
    zonesPermission: 'not-requested',
    activity: [
      {
        id: 'tm-m1',
        kind: 'message',
        when: 'Today',
        title: 'Tomas',
        from: 'athlete',
        body: 'Travel Wed–Thu — can we move threshold to Friday?',
        unread: true,
      },
      {
        id: 'tm-n1',
        kind: 'note',
        when: 'Today',
        title: 'Planning',
        body: 'Wed and Thu have no key sessions. Marathon build at risk.',
        unread: true,
      },
      {
        id: 'tm-f1',
        kind: 'feedback',
        when: 'Sat',
        title: 'Skipped',
        body: 'Family day. Will double up Sunday if energy allows.',
        unread: true,
        workout: {
          title: 'Easy Run',
          date: 'Sat 16 Aug',
          sport: 'run',
          distance: '8 km',
          duration: '45 min',
        },
      },
      {
        id: 'tm-f2',
        kind: 'feedback',
        when: 'Fri',
        title: 'Felt strong',
        body: 'Threshold felt controlled. Hit all reps.',
        workout: {
          title: 'Threshold Intervals',
          date: 'Fri 15 Aug',
          sport: 'run',
          distance: '10 km',
          duration: '48 min',
        },
      },
      {
        id: 'tm-f3',
        kind: 'feedback',
        when: 'Wed',
        title: 'Tough',
        body: 'Heat made Z2 harder than usual. Shortened by 10 min.',
        workout: {
          title: 'Aerobic Run',
          date: 'Wed 13 Aug',
          sport: 'run',
          distance: '12 km',
          duration: '58 min',
        },
      },
      {
        id: 'tm-f4',
        kind: 'feedback',
        when: 'Mon',
        title: 'Completed',
        body: 'Mobility done. Hip still a bit stiff on the left.',
        workout: {
          title: 'Mobility Flow',
          date: 'Mon 11 Aug',
          sport: 'mobility',
          duration: '25 min',
        },
      },
    ],
  },
  {
    id: 'ag',
    initials: 'AG',
    name: 'Aistė Giedraitė',
    status: 'Active',
    compliance: 100,
    completed: 4,
    planned: 4,
    lastWeekCompliance: 100,
    lastWeekCompleted: 9,
    lastWeekPlanned: 9,
    nextRace: 'HYROX Vilnius · 12d',
    nextRaceDays: 12,
    warning: null,
    attention: 0,
    attentionLabel: null,
    activity: [
      {
        id: 'ag-f1',
        kind: 'feedback',
        when: 'Yesterday',
        title: 'Felt strong',
        body: 'Wall balls were the limiter. Want one more station focus session.',
        unread: true,
        workout: {
          title: 'HYROX Simulation',
          date: 'Wed 20 Aug',
          sport: 'strength',
          duration: '75 min',
        },
      },
      {
        id: 'ag-m1',
        kind: 'message',
        when: 'Tue',
        title: 'You',
        from: 'coach',
        body: 'Taper starts Monday — keep sleep priority this week.',
      },
    ],
  },
  {
    id: 'rj',
    initials: 'RJ',
    name: 'Rokas Jankauskas',
    status: 'Inactive',
    compliance: 0,
    completed: 0,
    planned: 0,
    lastWeekCompliance: 0,
    lastWeekCompleted: 0,
    lastWeekPlanned: 0,
    nextRace: null,
    nextRaceDays: null,
    warning: null,
    attention: 0,
    attentionLabel: null,
    activity: [
      {
        id: 'rj-m1',
        kind: 'message',
        when: '3w ago',
        title: 'Rokas',
        from: 'athlete',
        body: 'Pausing coaching until September — travel season.',
      },
    ],
  },
  {
    id: 'mb',
    initials: 'MB',
    name: 'Miglė Balčiūnaitė',
    status: 'Active',
    compliance: 75,
    completed: 3,
    planned: 4,
    lastWeekCompliance: 75,
    lastWeekCompleted: 9,
    lastWeekPlanned: 12,
    nextRace: 'Local 10K · 8d',
    nextRaceDays: 8,
    warning: '2 reschedule requests',
    attention: 3,
    attentionLabel: 'Needs reply',
    activity: [
      {
        id: 'mb-m1',
        kind: 'message',
        when: '2h ago',
        title: 'Miglė',
        from: 'athlete',
        body: 'Can I swap Thursday intervals for an easy spin? Legs still heavy.',
        unread: true,
        workout: {
          title: 'Threshold Intervals',
          date: 'Thu 21 Aug',
          sport: 'run',
          distance: '8 km',
          duration: '42 min',
        },
        reschedule: {
          fromDate: 'Thu 21 Aug',
          toDate: 'Fri 22 Aug',
          status: 'pending',
        },
      },
      {
        id: 'mb-m2',
        kind: 'message',
        when: 'Yesterday',
        title: 'Miglė',
        from: 'athlete',
        body: 'Also — move Sunday long run to Saturday morning?',
        unread: true,
        workout: {
          title: 'Long Run',
          date: 'Sun 24 Aug',
          sport: 'run',
          distance: '18 km',
          duration: '1h 40m',
        },
        reschedule: {
          fromDate: 'Sun 24 Aug',
          toDate: 'Sat 23 Aug',
          status: 'pending',
        },
      },
      {
        id: 'mb-f1',
        kind: 'feedback',
        when: 'Mon',
        title: 'Tough',
        body: 'Hit splits but RPE high. Sleep was short the night before.',
        workout: {
          title: 'Threshold Run',
          date: 'Mon 18 Aug',
          sport: 'run',
          distance: '10 km',
          duration: '48 min',
        },
      },
    ],
  },
  {
    id: 'jv',
    initials: 'JV',
    name: 'Jonas Vaitkus',
    status: 'Active',
    compliance: 0,
    completed: 0,
    planned: 2,
    lastWeekCompliance: 0,
    lastWeekCompleted: 0,
    lastWeekPlanned: 0,
    nextRace: null,
    nextRaceDays: null,
    warning: 'Pending coaching connect',
    attention: 3,
    attentionLabel: 'New request',
    activity: [
      {
        id: 'jv-m1',
        kind: 'message',
        when: 'Today',
        title: 'Jonas',
        from: 'athlete',
        body: 'Hi — requesting to join your roster. Training for first 70.3.',
        unread: true,
        connectRequest: {
          status: 'pending',
          summary: 'Wants to join your coaching squad',
        },
      },
      {
        id: 'jv-n1',
        kind: 'note',
        when: 'Today',
        title: 'System',
        body: 'Pending coaching connect. Accept from chat to unlock planning.',
        unread: true,
      },
    ],
  },
  {
    id: 'ds',
    initials: 'DS',
    name: 'Dovydas Stankus',
    status: 'Archived',
    compliance: 0,
    completed: 0,
    planned: 0,
    lastWeekCompliance: 0,
    lastWeekCompleted: 0,
    lastWeekPlanned: 0,
    nextRace: null,
    nextRaceDays: null,
    warning: null,
    attention: 0,
    attentionLabel: null,
    activity: [],
  },
]

/** Three attention buckets on coach home — expand for compact action lists */
export const COACH_MOCK_ATTENTION_BLOCKS = [
  {
    id: 'requests',
    kind: 'request' as const,
    title: 'Join requests',
    summary: 'Athletes waiting to connect',
  },
  {
    id: 'underplanned',
    kind: 'plan' as const,
    title: 'Under-planned',
    summary: 'Gaps in the coming lead days',
  },
  {
    id: 'replies',
    kind: 'reply' as const,
    title: 'Needs reply',
    summary: 'Unread questions & reschedules',
  },
] as const

export type CoachAttentionBlockId = (typeof COACH_MOCK_ATTENTION_BLOCKS)[number]['id']

export type CoachJoinRequestItem = {
  id: string
  athleteId: string
  initials: string
  name: string
  meta: string
  when: string
  status: 'pending' | 'approved' | 'declined'
}

export type CoachUnderplannedItem = {
  id: string
  athleteId: string
  initials: string
  name: string
  week: string
  /** Last session already on the upcoming plan */
  lastUpcoming: string
}

export type CoachNeedsReplyItem = {
  id: string
  athleteId: string
  initials: string
  name: string
  preview: string
  count: number
  when: string
}

export const COACH_MOCK_JOIN_REQUESTS: CoachJoinRequestItem[] = [
  {
    id: 'jr-jv',
    athleteId: 'jv',
    initials: 'JV',
    name: 'Jonas Vaitkus',
    meta: 'First 70.3 · Vilnius',
    when: 'Today',
    status: 'pending',
  },
  {
    id: 'jr-ek',
    athleteId: 'ek',
    initials: 'EK',
    name: 'Emilija Kazėnaitė',
    meta: 'Olympic triathlon build',
    when: 'Yesterday',
    status: 'pending',
  },
]

export const COACH_MOCK_UNDERPLANNED: CoachUnderplannedItem[] = [
  {
    id: 'up-tm',
    athleteId: 'tm',
    initials: 'TM',
    name: 'Tomas Petrauskas',
    week: 'This week',
    lastUpcoming: 'Tue 19 Aug · Easy Run',
  },
  {
    id: 'up-jv',
    athleteId: 'jv',
    initials: 'JV',
    name: 'Jonas Vaitkus',
    week: 'This week',
    lastUpcoming: 'Mon 18 Aug · Swim Easy',
  },
  {
    id: 'up-mb',
    athleteId: 'mb',
    initials: 'MB',
    name: 'Miglė Balčiūnaitė',
    week: 'This week',
    lastUpcoming: 'Thu 21 Aug · Threshold Intervals',
  },
]

export const COACH_MOCK_NEEDS_REPLY: CoachNeedsReplyItem[] = [
  {
    id: 'nr-mb',
    athleteId: 'mb',
    initials: 'MB',
    name: 'Miglė Balčiūnaitė',
    preview: '2 reschedule asks · intervals + long run',
    count: 2,
    when: '2h ago',
  },
  {
    id: 'nr-tm',
    athleteId: 'tm',
    initials: 'TM',
    name: 'Tomas Petrauskas',
    preview: 'Travel Wed–Thu — move threshold?',
    count: 1,
    when: 'Today',
  },
]

/** @deprecated use COACH_MOCK_ATTENTION_BLOCKS */
export const COACH_MOCK_ATTENTION = COACH_MOCK_ATTENTION_BLOCKS
