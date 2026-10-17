import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  AthleteFingerprint,
  AthletePhysiologyModel,
  ResponsePrediction,
} from './types'

export type PhysiologySnapshotSource =
  | 'engine_draft'
  | 'learning_week'
  | 'learning_phase'
  | 'recompute'

export type StoredPhysiologySnapshot = {
  id: string
  athleteId: string
  asOf: Date
  source: PhysiologySnapshotSource
  model: AthletePhysiologyModel
  fingerprint: AthleteFingerprint
  prediction: ResponsePrediction | null
  planId: string | null
  createdAt: Date
}

function parseModel(json: unknown): AthletePhysiologyModel {
  return json as AthletePhysiologyModel
}

function parseFingerprint(json: unknown): AthleteFingerprint {
  return json as AthleteFingerprint
}

function parsePrediction(json: unknown): ResponsePrediction | null {
  if (json == null) return null
  return json as ResponsePrediction
}

function rowToStored(row: {
  id: string
  athleteId: string
  asOf: Date
  source: string
  modelJson: unknown
  fingerprintJson: unknown
  predictionJson: unknown
  planId: string | null
  createdAt: Date
}): StoredPhysiologySnapshot {
  return {
    id: row.id,
    athleteId: row.athleteId,
    asOf: row.asOf,
    source: row.source as PhysiologySnapshotSource,
    model: parseModel(row.modelJson),
    fingerprint: parseFingerprint(row.fingerprintJson),
    prediction: parsePrediction(row.predictionJson),
    planId: row.planId,
    createdAt: row.createdAt,
  }
}

export async function getLatestPhysiologySnapshot(
  athleteId: string,
): Promise<StoredPhysiologySnapshot | null> {
  if (
    !athleteId ||
    athleteId.startsWith('empty-') ||
    athleteId === 'general' ||
    // Unit-test fixtures (not real cuid athletes).
    athleteId.startsWith('ath_test') ||
    athleteId.startsWith('ath_apm')
  ) {
    return null
  }
  const row = await prisma.athletePhysiologySnapshot.findFirst({
    where: { athleteId },
    orderBy: { asOf: 'desc' },
  })
  return row ? rowToStored(row) : null
}

export async function listPhysiologySnapshots(
  athleteId: string,
  limit = 20,
): Promise<StoredPhysiologySnapshot[]> {
  const rows = await prisma.athletePhysiologySnapshot.findMany({
    where: { athleteId },
    orderBy: { asOf: 'desc' },
    take: Math.min(100, Math.max(1, limit)),
  })
  return rows.map(rowToStored)
}

export async function savePhysiologySnapshot(args: {
  athleteId: string
  source: PhysiologySnapshotSource
  model: AthletePhysiologyModel
  fingerprint: AthleteFingerprint
  prediction?: ResponsePrediction | null
  planId?: string | null
  asOf?: Date
}): Promise<StoredPhysiologySnapshot> {
  const asOf = args.asOf ?? new Date()
  const row = await prisma.athletePhysiologySnapshot.create({
    data: {
      athleteId: args.athleteId,
      asOf,
      source: args.source,
      modelJson: args.model as unknown as Prisma.InputJsonValue,
      fingerprintJson: args.fingerprint as unknown as Prisma.InputJsonValue,
      predictionJson:
        args.prediction != null
          ? (args.prediction as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      planId: args.planId ?? null,
    },
  })
  return rowToStored(row)
}

/** True if a snapshot already exists for this athlete on the UTC calendar day. */
export async function hasPhysiologySnapshotToday(
  athleteId: string,
  day: Date = new Date(),
): Promise<boolean> {
  const start = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
  )
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  const count = await prisma.athletePhysiologySnapshot.count({
    where: {
      athleteId,
      asOf: { gte: start, lt: end },
    },
  })
  return count > 0
}

/**
 * Persist learning snapshot at most once per UTC day (throttle).
 * Returns null when throttled.
 */
export async function savePhysiologySnapshotThrottled(args: {
  athleteId: string
  source: PhysiologySnapshotSource
  model: AthletePhysiologyModel
  fingerprint: AthleteFingerprint
  prediction?: ResponsePrediction | null
  planId?: string | null
}): Promise<StoredPhysiologySnapshot | null> {
  if (await hasPhysiologySnapshotToday(args.athleteId)) {
    return null
  }
  return savePhysiologySnapshot(args)
}
