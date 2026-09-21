import { Prisma } from '@prisma/client'
import {
  buildStructureChart,
  type StructureChartModel,
  type StructureChartSegment,
  type StructureChartSegmentKind,
} from '@/lib/workout-builder/structure-chart'
import { parseStructure } from '@/lib/workout-builder/utils'

/**
 * Compact plan-card silhouette — segments only (no block ids / captions).
 * ~10–40 small numbers vs full builder JSON.
 */
export type StructureDiagramSnapshot = {
  v: 1
  s: Array<{
    k: StructureChartSegmentKind
    /** Relative width */
    w: number
    /** 0–1 height */
    i: number
  }>
}

const KIND_SET = new Set<StructureChartSegmentKind>([
  'warmup',
  'work',
  'recovery',
  'easy',
  'cooldown',
  'rest',
])

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

function segmentsToSnapshot(
  segments: StructureChartSegment[],
): StructureDiagramSnapshot | null {
  if (segments.length === 0) return null
  return {
    v: 1,
    s: segments.map((seg) => ({
      k: seg.kind,
      w: round3(Math.max(0.01, seg.weight)),
      i: round3(Math.min(1, Math.max(0, seg.intensity))),
    })),
  }
}

/** Build a compact diagram from full structure (or return null). */
export function computeStructureDiagramSnapshot(
  structure: unknown,
  options?: { durationMinutes?: number | null },
): StructureDiagramSnapshot | null {
  const parsed = parseStructure(structure)
  const model = buildStructureChart(parsed, {
    durationMinutes: options?.durationMinutes ?? undefined,
  })
  if (!model?.segments.length) return null
  return segmentsToSnapshot(model.segments)
}

export function readStructureDiagramSnapshot(
  raw: unknown,
): StructureDiagramSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as { v?: unknown; s?: unknown }
  if (row.v !== 1 || !Array.isArray(row.s) || row.s.length === 0) return null
  const segments: StructureDiagramSnapshot['s'] = []
  for (const item of row.s) {
    if (!item || typeof item !== 'object') continue
    const seg = item as { k?: unknown; w?: unknown; i?: unknown }
    if (typeof seg.k !== 'string' || !KIND_SET.has(seg.k as StructureChartSegmentKind)) {
      continue
    }
    const w = typeof seg.w === 'number' ? seg.w : Number(seg.w)
    const i = typeof seg.i === 'number' ? seg.i : Number(seg.i)
    if (!Number.isFinite(w) || !Number.isFinite(i) || w <= 0) continue
    segments.push({
      k: seg.k as StructureChartSegmentKind,
      w,
      i: Math.min(1, Math.max(0, i)),
    })
  }
  return segments.length > 0 ? { v: 1, s: segments } : null
}

export function structureDiagramToChartModel(
  raw: unknown,
): StructureChartModel | null {
  const snapshot = readStructureDiagramSnapshot(raw)
  if (!snapshot) return null
  return {
    segments: snapshot.s.map((seg) => ({
      kind: seg.k,
      weight: seg.w,
      intensity: seg.i,
    })),
    blocks: null,
    caption: '',
  }
}

/** Prisma create/update value — DbNull clears when structure has no chart. */
export function structureDiagramPrismaValue(
  structure: unknown,
  options?: { durationMinutes?: number | null },
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const snapshot = computeStructureDiagramSnapshot(structure, options)
  if (!snapshot) return Prisma.DbNull
  return snapshot as unknown as Prisma.InputJsonValue
}
