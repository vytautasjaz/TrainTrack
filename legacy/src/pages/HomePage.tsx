import { useEffect, useMemo, useState } from 'react'
import { DayIntentModal } from '../components/Calendar/DayIntentModal'
import { WeekPlanView } from '../components/Calendar/WeekPlanView'
import { AppShell, type AppTab } from '../components/Layout/AppShell'
import { SettingsView } from '../components/Settings/SettingsView'
import { StatsView } from '../components/Stats/StatsView'
import { WeeklySummary } from '../components/Summary/WeeklySummary'
import { WorkoutModal } from '../components/WorkoutForm/AddWorkoutModal'
import { WorkoutFeedbackModal } from '../components/WorkoutForm/WorkoutFeedbackModal'
import { useRole } from '../context/RoleContext'
import { dayIntentRepository } from '../db/dayIntentRepository'
import { workoutRepository } from '../db/workoutRepository'
import { useDayIntents } from '../hooks/useDayIntents'
import { useMonthlyStats } from '../hooks/useMonthlyStats'
import { useWeeklySummary } from '../hooks/useWeeklySummary'
import type { CreateWorkoutInput, UpdateWorkoutExecutionInput, Workout } from '../types/workout'
import { formatDateLocal, getWeekBoundsForOffset } from '../utils/date'

export function HomePage() {
  const { role, canManageWorkouts, canLogExecution, canManageDayIntent } = useRole()
  const today = new Date()
  const [activeTab, setActiveTab] = useState<AppTab>('summary')
  const [selectedDate, setSelectedDate] = useState(today)
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [dayIntentModalOpen, setDayIntentModalOpen] = useState(false)
  const [modalFormKey, setModalFormKey] = useState(0)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [loggingWorkout, setLoggingWorkout] = useState<Workout | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [homeWeekOffset, setHomeWeekOffset] = useState(0)
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0)

  const selectedDateStr = formatDateLocal(selectedDate)
  const refresh = () => setRefreshToken((token) => token + 1)

  const homeWeekly = useWeeklySummary(homeWeekOffset, refreshToken)
  const calendarWeekly = useWeeklySummary(calendarWeekOffset, refreshToken)
  const monthly = useMonthlyStats(refreshToken)

  const calendarViewMonth = useMemo(
    () => ({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() }),
    [selectedDate],
  )
  const dayIntents = useDayIntents(calendarViewMonth, selectedDateStr, refreshToken)

  useEffect(() => {
    const { start, end } = getWeekBoundsForOffset(calendarWeekOffset)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const weekStart = new Date(start)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(end)
    weekEnd.setHours(0, 0, 0, 0)

    if (now >= weekStart && now <= weekEnd) {
      setSelectedDate(now)
    } else {
      setSelectedDate(weekStart)
    }
  }, [calendarWeekOffset])

  const calendarDayWorkouts = useMemo(
    () => calendarWeekly.weekWorkouts.filter((workout) => workout.date === selectedDateStr),
    [calendarWeekly.weekWorkouts, selectedDateStr],
  )

  const closeWorkoutModal = () => {
    setWorkoutModalOpen(false)
    setEditingWorkout(null)
  }

  const closeFeedbackModal = () => {
    setFeedbackModalOpen(false)
    setLoggingWorkout(null)
  }

  const closeDayIntentModal = () => {
    setDayIntentModalOpen(false)
  }

  const openAddWorkoutModal = () => {
    setEditingWorkout(null)
    setModalFormKey((key) => key + 1)
    setWorkoutModalOpen(true)
  }

  const openEditWorkoutModal = (workout: Workout) => {
    setEditingWorkout(workout)
    setModalFormKey((key) => key + 1)
    setWorkoutModalOpen(true)
  }

  const openFeedbackModal = (workout: Workout) => {
    setLoggingWorkout(workout)
    setFeedbackModalOpen(true)
  }

  const openDayIntentModal = () => {
    setDayIntentModalOpen(true)
  }

  const handlePrimaryAdd = () => {
    if (canManageWorkouts) {
      openAddWorkoutModal()
      return
    }

    if (canManageDayIntent) {
      openDayIntentModal()
    }
  }

  const handleSaveWorkout = async (input: CreateWorkoutInput) => {
    if (editingWorkout) {
      await workoutRepository.update(editingWorkout.id, input)
    } else {
      await workoutRepository.create(input)
    }
    refresh()
  }

  const handleSaveFeedback = async (input: UpdateWorkoutExecutionInput) => {
    if (!loggingWorkout) return
    await workoutRepository.updateExecution(loggingWorkout.id, input)
    refresh()
  }

  const handleSaveDayIntent = async (input: Parameters<typeof dayIntentRepository.upsert>[0]) => {
    await dayIntentRepository.upsert(input)
    refresh()
  }

  const handleDeleteDayIntent = async () => {
    await dayIntentRepository.deleteByDate(selectedDateStr)
    refresh()
  }

  const handleDeleteWorkout = async (workout: Workout) => {
    const confirmed = window.confirm(`Delete "${workout.title}"? This cannot be undone.`)
    if (!confirmed) return

    await workoutRepository.delete(workout.id)
    refresh()
  }

  const modalDefaultDate =
    editingWorkout?.date ??
    (activeTab === 'calendar' ? selectedDateStr : formatDateLocal(today))
  const showAddButton = canManageWorkouts || canManageDayIntent
  const addButtonLabel = canManageWorkouts ? 'Assign workout' : 'Plan day ahead'

  return (
    <AppShell
      activeTab={activeTab}
      role={role}
      showAddButton={showAddButton}
      addButtonLabel={addButtonLabel}
      onTabChange={setActiveTab}
      onAdd={handlePrimaryAdd}
    >
      {activeTab === 'summary' && (
        <>
          <WeeklySummary
            stats={homeWeekly.stats}
            weekStart={homeWeekly.weekStart}
            weekEnd={homeWeekly.weekEnd}
            weekOffset={homeWeekOffset}
            loading={homeWeekly.loading}
            onPrevWeek={() => setHomeWeekOffset((offset) => offset - 1)}
            onNextWeek={() => setHomeWeekOffset((offset) => offset + 1)}
          />
          <div className="mt-8 border-t border-gray-100 pt-6">
            <StatsView
              stats={monthly.stats}
              typeCounts={monthly.typeCounts}
              monthLabel={monthly.monthLabel}
              loading={monthly.loading}
            />
          </div>
        </>
      )}

      {activeTab === 'calendar' && (
        <WeekPlanView
          weekWorkouts={calendarWeekly.weekWorkouts}
          dayWorkouts={calendarDayWorkouts}
          weekStart={calendarWeekly.weekStart}
          weekEnd={calendarWeekly.weekEnd}
          weekOffset={calendarWeekOffset}
          selectedDate={selectedDate}
          dayIntent={dayIntents.selectedIntent}
          loading={calendarWeekly.loading || dayIntents.loading}
          isCoach={canManageWorkouts}
          isTrainee={canLogExecution}
          onSelectDay={setSelectedDate}
          onPrevWeek={() => setCalendarWeekOffset((offset) => offset - 1)}
          onNextWeek={() => setCalendarWeekOffset((offset) => offset + 1)}
          onEditWorkout={openEditWorkoutModal}
          onDeleteWorkout={handleDeleteWorkout}
          onLogWorkout={openFeedbackModal}
          onEditDayIntent={openDayIntentModal}
          onAddDayIntent={openDayIntentModal}
        />
      )}

      {activeTab === 'settings' && <SettingsView onDataCleared={refresh} />}

      {canManageWorkouts && (
        <WorkoutModal
          defaultDate={modalDefaultDate}
          workout={editingWorkout ?? undefined}
          formKey={modalFormKey}
          open={workoutModalOpen}
          onClose={closeWorkoutModal}
          onSave={handleSaveWorkout}
        />
      )}

      {canLogExecution && (
        <WorkoutFeedbackModal
          workout={loggingWorkout}
          open={feedbackModalOpen}
          onClose={closeFeedbackModal}
          onSave={handleSaveFeedback}
        />
      )}

      {canManageDayIntent && (
        <DayIntentModal
          defaultDate={selectedDateStr}
          intent={dayIntents.selectedIntent}
          open={dayIntentModalOpen}
          onClose={closeDayIntentModal}
          onSave={handleSaveDayIntent}
          onDelete={dayIntents.selectedIntent ? handleDeleteDayIntent : undefined}
        />
      )}
    </AppShell>
  )
}
