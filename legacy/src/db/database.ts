import Dexie, { type Table } from 'dexie'
import type { DayIntent } from '../types/dayIntent'
import type { Workout } from '../types/workout'

export class TrainTrackDB extends Dexie {
  workouts!: Table<Workout, string>
  dayIntents!: Table<DayIntent, string>

  constructor() {
    super('TrainTrackDB')
    this.version(1).stores({
      workouts: 'id, date, updatedAt',
    })
    this.version(2).stores({
      workouts: 'id, date, type, updatedAt',
    })
    this.version(3).stores({
      workouts: 'id, date, type, updatedAt',
      dayIntents: 'id, date, updatedAt',
    })
  }
}

export const db = new TrainTrackDB()
