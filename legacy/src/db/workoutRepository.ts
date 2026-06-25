import { db } from './database'
import type { CreateWorkoutInput, UpdateWorkoutExecutionInput, Workout } from '../types/workout'
import { isEnduranceType, usesExercises } from '../types/workout'

function buildWorkoutPayload(input: CreateWorkoutInput): Pick<
  Workout,
  'date' | 'type' | 'title' | 'notes' | 'endurance' | 'brick' | 'exercises'
> {
  return {
    date: input.date,
    type: input.type,
    title: input.title,
    notes: input.notes,
    endurance: isEnduranceType(input.type) ? input.endurance : undefined,
    brick: input.type === 'brick' ? input.brick : undefined,
    exercises: usesExercises(input.type) ? input.exercises : undefined,
  }
}

async function queryDateRange(start: string, end: string): Promise<Workout[]> {
  return db.workouts
    .where('date')
    .between(start, end, true, true)
    .filter((w) => !w.deletedAt)
    .toArray()
}

export const workoutRepository = {
  async getByDate(date: string): Promise<Workout[]> {
    return db.workouts
      .where('date')
      .equals(date)
      .filter((w) => !w.deletedAt)
      .toArray()
  },

  async getByMonth(year: number, month: number): Promise<Workout[]> {
    const monthStr = String(month + 1).padStart(2, '0')
    const start = `${year}-${monthStr}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

    return queryDateRange(start, end)
  },

  async getByDateRange(start: string, end: string): Promise<Workout[]> {
    return queryDateRange(start, end)
  },

  async getFromDate(from: string): Promise<Workout[]> {
    const workouts = await db.workouts
      .where('date')
      .between(from, '9999-12-31', true, true)
      .filter((w) => !w.deletedAt)
      .toArray()

    return workouts.sort((a, b) => a.date.localeCompare(b.date))
  },

  async create(input: CreateWorkoutInput): Promise<Workout> {
    const now = new Date().toISOString()
    const workout: Workout = {
      id: crypto.randomUUID(),
      ...buildWorkoutPayload(input),
      createdAt: now,
      updatedAt: now,
    }
    await db.workouts.add(workout)
    return workout
  },

  async update(id: string, input: CreateWorkoutInput): Promise<Workout | undefined> {
    const existing = await db.workouts.get(id)
    if (!existing || existing.deletedAt) return undefined

    const updated: Workout = {
      ...existing,
      ...buildWorkoutPayload(input),
      updatedAt: new Date().toISOString(),
    }
    await db.workouts.put(updated)
    return updated
  },

  async updateExecution(
    id: string,
    input: UpdateWorkoutExecutionInput,
  ): Promise<Workout | undefined> {
    const existing = await db.workouts.get(id)
    if (!existing || existing.deletedAt) return undefined

    const updated: Workout = {
      ...existing,
      execution: {
        status: input.status,
        feedback: input.feedback,
        feelRating: input.feelRating,
        actualEndurance: input.actualEndurance,
        actualExercises: input.actualExercises,
        loggedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    }
    await db.workouts.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const existing = await db.workouts.get(id)
    if (!existing) return

    await db.workouts.put({
      ...existing,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  },

  async getAll(): Promise<Workout[]> {
    return db.workouts.filter((w) => !w.deletedAt).toArray()
  },

  async clearAll(): Promise<void> {
    await db.workouts.clear()
  },
}
