import { redirect } from 'next/navigation'
import type { WorkoutType } from '@prisma/client'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { PageHeader } from '@/components/ui/page-header'
import { PlanTableView } from '@/components/plan/plan-table-view'
import { MonthCalendarView } from '@/components/plan/month-calendar-view'
import { TrainingListView } from '@/components/training/training-list-view'
import { TrainingCalendarControls } from '@/components/training/training-calendar-controls'
import {
  getDayNotesForRange,
  getMonthWorkouts,
  getPlanWorkouts,
  getPlanWorkoutsInRange,
  getRacesForRange,
  getWeekDays,
  getWeekExtraPlanSportRows,
  getWeekHiddenPlanSportRows,
  groupDayNotesByDate,
  groupWorkoutsByDate,
} from '@/lib/queries'
import { getSession, getCoachAthletes, resolveAthleteId } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { toPlanWorkoutDetail } from '@/lib/plan-workout'
import { mergeRacesIntoByDate } from '@/lib/races'
import { buildPlanTableDays } from '@/lib/plan-week'
import { buildTrainingDays } from '@/lib/training-timeline'
import { todayDateOnly, toDateKey } from '@/lib/dates'
import { CoachAthleteSelect } from '@/components/coach/coach-athlete-select'
import { CoachTrainingAthleteHeading } from '@/components/coach/coach-training-athlete-heading'

type TrainingView = 'list' | 'week' | 'month'

type TrainingPageProps = {
  searchParams: Promise<{ week?: string; month?: string; view?: string }>
}

function parseView(raw: string | undefined): TrainingView {
  if (raw === 'month') return 'month'
  if (raw === 'list') return 'list'
  return 'week'
}

export default async function TrainingPage({ searchParams }: TrainingPageProps) {
  const session = await getSession()
  if (!session) redirect('/')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/')

  const params = await searchParams
  const weekOffset = parseInt(params.week ?? '0', 10) || 0
  const monthOffset = parseInt(params.month ?? '0', 10) || 0
  const view = parseView(params.view)

  const anchor =
    view === 'month'
      ? addMonths(startOfMonth(new Date()), monthOffset)
      : addWeeks(new Date(), weekOffset)
  anchor.setHours(0, 0, 0, 0)

  const monthGridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
  const monthGridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 })
  const listRangeStart = todayDateOnly()
  const listRangeEnd = addDays(listRangeStart, 13)

  const rangeStart = view === 'list' ? listRangeStart : view === 'month' ? monthGridStart : weekStart
  const rangeEnd = view === 'list' ? listRangeEnd : view === 'month' ? monthGridEnd : weekEnd

  const rawWorkouts =
    view === 'month'
      ? await getMonthWorkouts(athleteId, anchor.getFullYear(), anchor.getMonth())
      : view === 'list'
        ? await getPlanWorkoutsInRange(athleteId, listRangeStart, listRangeEnd)
        : await getPlanWorkouts(athleteId, anchor)

  const byDateRaw = groupWorkoutsByDate(rawWorkouts)
  const byDateWorkouts = new Map(
    [...byDateRaw.entries()].map(([key, list]) => [key, list.map(toPlanWorkoutDetail)]),
  )
  const races = await getRacesForRange(athleteId, rangeStart, rangeEnd)
  const byDate = mergeRacesIntoByDate(byDateWorkouts, races)

  const dayNotes = await getDayNotesForRange(athleteId, rangeStart, rangeEnd)
  const notesByDate = groupDayNotesByDate(dayNotes)

  const weekDays = getWeekDays(anchor)
  const listIntervalDays = eachDayOfInterval({ start: listRangeStart, end: listRangeEnd })
  const listDays =
    view === 'month'
      ? eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) })
      : view === 'list'
        ? listIntervalDays
        : weekDays

  const trainingDays = buildTrainingDays(listDays)
  const tableDays = buildPlanTableDays(
    view === 'list' ? listIntervalDays : weekDays,
    byDate,
    notesByDate,
  )
  const isCoach = session.role === 'COACH'
  const canLogWorkout = session.role === 'ATHLETE' && Boolean(session.athleteId)
  const today = format(new Date(), 'yyyy-MM-dd')

  const weekStartKey = toDateKey(weekStart)
  const coachAthletes = isCoach ? await getCoachAthletes(session.userId) : []
  const selectedAthlete = coachAthletes.find((a) => a.id === athleteId)
  const [athletePlanConfig, weekExtraPlanSportRows, weekHiddenPlanSportRows] = isCoach
    ? await Promise.all([
        prisma.athlete.findUnique({
          where: { id: athleteId },
          select: { planSportRows: true },
        }),
        getWeekExtraPlanSportRows(athleteId, weekStart),
        getWeekHiddenPlanSportRows(athleteId, weekStart),
      ])
    : [null, [] as WorkoutType[], [] as WorkoutType[]]

  const weekQuery = `week=${weekOffset}`
  const monthQuery = `month=${monthOffset}`
  const prevWeek = weekOffset - 1
  const nextWeek = weekOffset + 1
  const prevMonth = monthOffset - 1
  const nextMonth = monthOffset + 1

  const prevHref =
    view === 'month'
      ? `/training?view=month&month=${prevMonth}`
      : `/training?view=${view}&week=${prevWeek}`
  const nextHref =
    view === 'month'
      ? `/training?view=month&month=${nextMonth}`
      : `/training?view=${view}&week=${nextWeek}`

  const viewLabel =
    view === 'month' ? 'month view' : view === 'week' ? 'week view' : 'list view'

  const trainingRedirectTo =
    view === 'month'
      ? `/training?view=month&month=${monthOffset}`
      : `/training?view=${view}&week=${weekOffset}`

  const trainingDescription = isCoach
    ? viewLabel.charAt(0).toUpperCase() + viewLabel.slice(1)
    : `Combined plan & history — ${viewLabel}`

  const listViewHeader = (
    <>
      <PageHeader
        title="Training"
        description={trainingDescription}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isCoach && coachAthletes.length > 0 && (
              <CoachAthleteSelect
                athletes={coachAthletes}
                selectedAthleteId={athleteId}
                redirectTo={trainingRedirectTo}
              />
            )}
            <TrainingCalendarControls
              view={view}
              listHref={`/training?view=list&${weekQuery}`}
              weekHref={`/training?view=week&${weekQuery}`}
              monthHref={`/training?view=month&${monthQuery}`}
              prevHref={prevHref}
              nextHref={nextHref}
              canLogWorkout={canLogWorkout}
              showPeriodNav={view !== 'list'}
            />
          </div>
        }
      />
      {isCoach && selectedAthlete && (
        <CoachTrainingAthleteHeading
          athleteId={selectedAthlete.id}
          name={selectedAthlete.name}
          status={selectedAthlete.status}
        />
      )}
    </>
  )

  return (
    <div className="space-y-6 landscape:max-lg:space-y-3">
      {view !== 'list' && listViewHeader}

      {view === 'list' && (
        <TrainingListView
          days={trainingDays}
          planDays={tableDays}
          isCoach={isCoach}
          canEditDayNotes
          athleteId={athleteId}
          header={listViewHeader}
        />
      )}

      {view === 'week' && (
        <PlanTableView
          days={tableDays}
          isCoach={isCoach}
          canEditDayNotes
          athleteId={athleteId}
          athleteName={isCoach ? selectedAthlete?.name : undefined}
          weekStartKey={isCoach ? weekStartKey : undefined}
          planSportRows={athletePlanConfig?.planSportRows ?? []}
          weekExtraPlanSportRows={weekExtraPlanSportRows}
          weekHiddenPlanSportRows={weekHiddenPlanSportRows}
        />
      )}

      {view === 'month' && (
        <MonthCalendarView
          monthLabel={format(anchor, 'MMMM yyyy')}
          days={eachDayOfInterval({ start: monthGridStart, end: monthGridEnd }).map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            return {
              dateKey: key,
              dayNumber: parseInt(format(day, 'd'), 10),
              inMonth: day.getMonth() === anchor.getMonth(),
              isToday: key === today,
            }
          })}
          workoutsByDate={byDate}
          notesByDate={notesByDate}
          isCoach={isCoach}
          anchorMonth={anchor}
          athleteId={athleteId}
          trainingMode
        />
      )}
    </div>
  )
}
