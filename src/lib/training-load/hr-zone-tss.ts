/** Seconds spent in HR zones 1–5 (Z5 = above Z4 max). */
export type HrZoneSeconds = {
  z1: number
  z2: number
  z3: number
  z4: number
  z5: number
}

export type HrZoneBounds = {
  z1Max: number
  z2Max: number
  z3Max: number
  z4Max: number
}

/** Intensity factors for time-in-zone TSS (IF² × hours × 100). */
const ZONE_IF: Record<keyof HrZoneSeconds, number> = {
  z1: 0.5,
  z2: 0.65,
  z3: 0.8,
  z4: 0.9,
  z5: 1.05,
}

export function emptyHrZoneSeconds(): HrZoneSeconds {
  return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
}

export function parseHrZoneSeconds(value: unknown): HrZoneSeconds | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const read = (key: keyof HrZoneSeconds) => {
    const n = Number(raw[key])
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const parsed = {
    z1: read('z1'),
    z2: read('z2'),
    z3: read('z3'),
    z4: read('z4'),
    z5: read('z5'),
  }
  const total = parsed.z1 + parsed.z2 + parsed.z3 + parsed.z4 + parsed.z5
  return total > 0 ? parsed : null
}

export function resolveHrZoneBounds(input: {
  hrZone1Max?: number | null
  hrZone2Max?: number | null
  hrZone3Max?: number | null
  hrZone4Max?: number | null
}): HrZoneBounds | null {
  const z1 = input.hrZone1Max
  const z2 = input.hrZone2Max
  const z3 = input.hrZone3Max
  const z4 = input.hrZone4Max
  if (
    z1 == null ||
    z2 == null ||
    z3 == null ||
    z4 == null ||
    !(z1 > 0 && z2 > z1 && z3 > z2 && z4 > z3)
  ) {
    return null
  }
  return { z1Max: z1, z2Max: z2, z3Max: z3, z4Max: z4 }
}

function zoneForHr(hr: number, bounds: HrZoneBounds): keyof HrZoneSeconds {
  if (hr <= bounds.z1Max) return 'z1'
  if (hr <= bounds.z2Max) return 'z2'
  if (hr <= bounds.z3Max) return 'z3'
  if (hr <= bounds.z4Max) return 'z4'
  return 'z5'
}

/**
 * Bin HR samples into zone seconds.
 * Prefer paired `time` stream (seconds from start); otherwise assume ~1 Hz.
 */
export function computeHrZoneSeconds(
  heartrate: number[],
  timeSeconds: number[] | null,
  bounds: HrZoneBounds,
): HrZoneSeconds | null {
  if (heartrate.length < 2) return null

  const zones = emptyHrZoneSeconds()
  const useTime =
    timeSeconds != null &&
    timeSeconds.length === heartrate.length &&
    timeSeconds.some((t, i) => i > 0 && t > (timeSeconds[i - 1] ?? 0))

  for (let i = 0; i < heartrate.length; i++) {
    const hr = heartrate[i]
    if (hr == null || !Number.isFinite(hr) || hr <= 0) continue

    let dt = 1
    if (useTime && timeSeconds) {
      if (i === 0) {
        dt = Math.max(0, timeSeconds[0] ?? 1)
        if (dt <= 0) dt = 1
      } else {
        dt = Math.max(0, (timeSeconds[i] ?? 0) - (timeSeconds[i - 1] ?? 0))
        // Cap gaps (pauses / drops) so a long gap doesn't inflate one zone.
        if (dt > 30) dt = 1
      }
    }

    zones[zoneForHr(hr, bounds)] += dt
  }

  const total = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5
  return total > 0 ? zones : null
}

/** TSS from time-in-zone: Σ (hours × IF² × 100). */
export function estimateTssFromHrZoneSeconds(zones: HrZoneSeconds): {
  tss: number
  intensityFactor: number
} {
  let tss = 0
  let weightedIf = 0
  let totalHours = 0

  for (const key of Object.keys(ZONE_IF) as Array<keyof HrZoneSeconds>) {
    const hours = zones[key] / 3600
    if (hours <= 0) continue
    const intensityFactor = ZONE_IF[key]
    tss += hours * intensityFactor * intensityFactor * 100
    weightedIf += intensityFactor * hours
    totalHours += hours
  }

  return {
    tss: Math.max(0, Math.round(tss * 10) / 10),
    intensityFactor: totalHours > 0 ? weightedIf / totalHours : ZONE_IF.z2,
  }
}
