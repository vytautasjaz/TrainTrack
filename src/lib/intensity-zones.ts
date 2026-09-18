/**
 * Canonical coach intensity zones (% FTP bands + Z1–Z6).
 * Defaults match common endurance training bands; coaches can override in preferences.
 */

export type IntensityZoneId =
  | 'recovery'
  | 'easy'
  | 'tempo'
  | 'threshold'
  | 'vo2max'
  | 'anaerobic'

export type IntensityZoneDef = {
  id: IntensityZoneId
  /** Zone number shown as Z1–Z6 in the builder. */
  zIndex: 1 | 2 | 3 | 4 | 5 | 6
  label: string
  shortLabel: string
  description: string
  /** Inclusive lower % FTP bound; null = open below. */
  minPct: number | null
  /** Inclusive upper % FTP bound; null = open above. */
  maxPct: number | null
}

export type IntensityZoneBoundOverride = {
  minPct?: number | null
  maxPct?: number | null
}

/** Partial overrides stored on coach workoutBuilderPrefs.intensityZones */
export type IntensityZoneBounds = Partial<
  Record<IntensityZoneId, IntensityZoneBoundOverride>
>

export const DEFAULT_INTENSITY_ZONES: readonly IntensityZoneDef[] = [
  {
    id: 'recovery',
    zIndex: 1,
    label: 'Recovery',
    shortLabel: 'Z1',
    description: 'Recovery / very easy',
    minPct: null,
    maxPct: 54,
  },
  {
    id: 'easy',
    zIndex: 2,
    label: 'Easy / Endurance',
    shortLabel: 'Z2',
    description: 'Easy / Endurance',
    minPct: 55,
    maxPct: 75,
  },
  {
    id: 'tempo',
    zIndex: 3,
    label: 'Tempo',
    shortLabel: 'Z3',
    description: 'Tempo',
    minPct: 76,
    maxPct: 90,
  },
  {
    id: 'threshold',
    zIndex: 4,
    label: 'Threshold',
    shortLabel: 'Z4',
    description: 'Threshold',
    minPct: 91,
    maxPct: 105,
  },
  {
    id: 'vo2max',
    zIndex: 5,
    label: 'VO₂max',
    shortLabel: 'Z5',
    description: 'VO₂max',
    minPct: 106,
    maxPct: 120,
  },
  {
    id: 'anaerobic',
    zIndex: 6,
    label: 'Anaerobic',
    shortLabel: 'Z6',
    description: 'Anaerobic',
    minPct: 121,
    maxPct: null,
  },
] as const

export const INTENSITY_ZONE_IDS: readonly IntensityZoneId[] =
  DEFAULT_INTENSITY_ZONES.map((z) => z.id)

export const INTENSITY_ZONE_PRESETS = DEFAULT_INTENSITY_ZONES.map(
  (z) => z.shortLabel,
) as readonly string[]

const ZONE_BY_ID = new Map(
  DEFAULT_INTENSITY_ZONES.map((z) => [z.id, z] as const),
)

function clampPct(value: unknown): number | null | undefined {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.round(Math.max(0, Math.min(300, value)))
}

export function parseIntensityZoneBounds(raw: unknown): IntensityZoneBounds | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const root = raw as Record<string, unknown>
  const out: IntensityZoneBounds = {}
  for (const id of INTENSITY_ZONE_IDS) {
    const entry = root[id]
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    const minPct = clampPct(e.minPct)
    const maxPct = clampPct(e.maxPct)
    if (minPct === undefined && maxPct === undefined) continue
    out[id] = {
      ...(minPct !== undefined ? { minPct } : {}),
      ...(maxPct !== undefined ? { maxPct } : {}),
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function resolveIntensityZones(
  bounds?: IntensityZoneBounds | null,
): IntensityZoneDef[] {
  return DEFAULT_INTENSITY_ZONES.map((base) => {
    const override = bounds?.[base.id]
    if (!override) return { ...base }
    return {
      ...base,
      minPct:
        override.minPct !== undefined ? override.minPct : base.minPct,
      maxPct:
        override.maxPct !== undefined ? override.maxPct : base.maxPct,
    }
  })
}

/** Format a zone’s % FTP range for UI (e.g. "<55%", "55–75%", ">120%"). */
export function formatZonePctRange(zone: IntensityZoneDef): string {
  if (zone.minPct == null && zone.maxPct != null) {
    return `<${zone.maxPct + 1}%`
  }
  if (zone.maxPct == null && zone.minPct != null) {
    return `>${zone.minPct - 1}%`
  }
  if (zone.minPct != null && zone.maxPct != null) {
    return `${zone.minPct}–${zone.maxPct}%`
  }
  return '—'
}

/**
 * Map % FTP to a zone. Higher zones win on boundary ties when ranges touch.
 * Uses inclusive bounds from resolved defs.
 */
export function ftpPercentToZoneId(
  pct: number,
  zones: IntensityZoneDef[] = resolveIntensityZones(),
): IntensityZoneId {
  if (!Number.isFinite(pct) || pct <= 0) return 'easy'

  // Walk high → low so overlapping/touching edges prefer harder work.
  for (let i = zones.length - 1; i >= 0; i--) {
    const z = zones[i]!
    const aboveMin = z.minPct == null || pct >= z.minPct
    const belowMax = z.maxPct == null || pct <= z.maxPct
    if (aboveMin && belowMax) return z.id
  }

  // Fallback by nearest band using defaults.
  if (pct >= 121) return 'anaerobic'
  if (pct >= 106) return 'vo2max'
  if (pct >= 91) return 'threshold'
  if (pct >= 76) return 'tempo'
  if (pct >= 55) return 'easy'
  return 'recovery'
}

export function zoneIdFromZIndex(z: number): IntensityZoneId | null {
  if (!Number.isFinite(z) || z < 1 || z > 6) return null
  return DEFAULT_INTENSITY_ZONES[z - 1]?.id ?? null
}

export function zoneDefFromZLabel(
  value: string,
  zones: IntensityZoneDef[] = resolveIntensityZones(),
): IntensityZoneDef | null {
  const n = parseInt(value.replace(/\D/g, ''), 10)
  if (!Number.isFinite(n)) return null
  return zones.find((z) => z.zIndex === n) ?? null
}

export function zoneDefById(
  id: IntensityZoneId,
  zones: IntensityZoneDef[] = resolveIntensityZones(),
): IntensityZoneDef {
  return zones.find((z) => z.id === id) ?? ZONE_BY_ID.get(id)!
}

/** Midpoint % FTP for a zone (useful when seeding powerZone from a named zone). */
export function zoneMidFtpPercent(zone: IntensityZoneDef): number {
  if (zone.minPct != null && zone.maxPct != null) {
    return Math.round((zone.minPct + zone.maxPct) / 2)
  }
  if (zone.maxPct != null) return Math.max(1, zone.maxPct - 5)
  if (zone.minPct != null) return zone.minPct + 10
  return 70
}

export function intensityZoneSelectOptions(
  zones: IntensityZoneDef[] = resolveIntensityZones(),
): { value: string; label: string }[] {
  return zones.map((z) => ({
    value: z.shortLabel,
    label: `${z.shortLabel} · ${z.label}`,
  }))
}

/** Rank for “hardest wins” comparisons (recovery → anaerobic). */
export const INTENSITY_ZONE_RANK: Record<IntensityZoneId, number> = {
  recovery: 0,
  easy: 1,
  tempo: 2,
  threshold: 3,
  vo2max: 4,
  anaerobic: 5,
}

/**
 * Zones that map to athlete pace/speed preference fields.
 * Anaerobic reuses VO₂max athlete prefs.
 */
export type AthleteIntensityPrefZone = Exclude<IntensityZoneId, 'anaerobic'>

export function toAthleteIntensityPrefZone(
  id: IntensityZoneId,
): AthleteIntensityPrefZone {
  return id === 'anaerobic' ? 'vo2max' : id
}

/** Ensure contiguous, non-inverted coach overrides before save. */
export function sanitizeIntensityZoneBounds(
  bounds: IntensityZoneBounds | null | undefined,
): IntensityZoneBounds | undefined {
  if (!bounds) return undefined
  const resolved = resolveIntensityZones(bounds)
  const out: IntensityZoneBounds = {}

  for (let i = 0; i < resolved.length; i++) {
    const z = resolved[i]!
    const base = DEFAULT_INTENSITY_ZONES[i]!
    const changed =
      z.minPct !== base.minPct || z.maxPct !== base.maxPct
    if (!changed) continue
    out[z.id] = {
      minPct: z.minPct,
      maxPct: z.maxPct,
    }
  }

  return Object.keys(out).length > 0 ? out : undefined
}
