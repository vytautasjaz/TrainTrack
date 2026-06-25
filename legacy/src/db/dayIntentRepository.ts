import { db } from './database'
import type { DayIntent, UpsertDayIntentInput } from '../types/dayIntent'

async function queryDateRange(start: string, end: string): Promise<DayIntent[]> {
  return db.dayIntents
    .where('date')
    .between(start, end, true, true)
    .filter((intent) => !intent.deletedAt)
    .toArray()
}

export const dayIntentRepository = {
  async getByDate(date: string): Promise<DayIntent | undefined> {
    return db.dayIntents
      .where('date')
      .equals(date)
      .filter((intent) => !intent.deletedAt)
      .first()
  },

  async getByMonth(year: number, month: number): Promise<DayIntent[]> {
    const monthStr = String(month + 1).padStart(2, '0')
    const start = `${year}-${monthStr}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

    return queryDateRange(start, end)
  },

  async upsert(input: UpsertDayIntentInput): Promise<DayIntent> {
    const existing = await this.getByDate(input.date)
    const now = new Date().toISOString()

    if (existing) {
      const updated: DayIntent = {
        ...existing,
        status: input.status,
        notes: input.notes,
        updatedAt: now,
      }
      await db.dayIntents.put(updated)
      return updated
    }

    const intent: DayIntent = {
      id: crypto.randomUUID(),
      date: input.date,
      status: input.status,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }
    await db.dayIntents.add(intent)
    return intent
  },

  async deleteByDate(date: string): Promise<void> {
    const existing = await this.getByDate(date)
    if (!existing) return

    await db.dayIntents.put({
      ...existing,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  },

  async clearAll(): Promise<void> {
    await db.dayIntents.clear()
  },

  async getAll(): Promise<DayIntent[]> {
    return db.dayIntents.filter((intent) => !intent.deletedAt).toArray()
  },
}
