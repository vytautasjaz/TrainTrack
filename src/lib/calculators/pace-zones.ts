import type { AthletePaceZones } from '@/lib/athlete-preferences'

export type IntensityZoneId = 'easy' | 'tempo' | 'threshold' | 'race'

export const INTENSITY_ZONES: {
  id: IntensityZoneId
  label: string
  className: string
}[] = [
  { id: 'easy', label: 'Easy', className: 'bg-emerald-500' },
  { id: 'tempo', label: 'Tempo', className: 'bg-amber-500' },
  { id: 'threshold', label: 'Threshold', className: 'bg-red-500' },
  { id: 'race', label: 'Race', className: 'bg-violet-500' },
]

/** Convert pace (min/km) to speed (km/h). */
export function paceToSpeedKmh(minPerKm: number): number | null {
  if (!Number.isFinite(minPerKm) || minPerKm <= 0) return null
  return 60 / minPerKm
}

export function formatSpeedKmh(kmh: number): string {
  return `${kmh % 1 === 0 ? kmh : kmh.toFixed(1)} km/h`
}

/**
 * Marker position 0–100 along Easy → Tempo → Threshold → Race.
 * Faster pace → higher intensity (closer to 100).
 */
export function resolveIntensityMarker(
  paceMinPerKm: number | null,
  zones: AthletePaceZones | null,
): number | null {
  if (paceMinPerKm == null || paceMinPerKm <= 0) return null

  const easy = zones?.paceEasyMinPerKm ?? null
  const tempo = zones?.paceTempoMinPerKm ?? null
  const threshold = zones?.paceThresholdMinPerKm ?? null
  const race = zones?.paceVo2MaxMinPerKm ?? null

  const anchors =
    easy != null && tempo != null && threshold != null && race != null
      ? [easy, tempo, threshold, race]
      : relativeAnchors(paceMinPerKm)

  // anchors are descending pace (slower → faster): easy > tempo > threshold > race
  const sorted = [...anchors].sort((a, b) => b - a)
  const [a0, a1, a2, a3] = sorted

  if (paceMinPerKm >= a0) return 8
  if (paceMinPerKm <= a3) return 92

  const points = [
    { pace: a0, pct: 12.5 },
    { pace: a1, pct: 37.5 },
    { pace: a2, pct: 62.5 },
    { pace: a3, pct: 87.5 },
  ]

  for (let i = 0; i < points.length - 1; i++) {
    const left = points[i]
    const right = points[i + 1]
    if (paceMinPerKm <= left.pace && paceMinPerKm >= right.pace) {
      const t = (left.pace - paceMinPerKm) / (left.pace - right.pace)
      return left.pct + t * (right.pct - left.pct)
    }
  }

  return 50
}

function relativeAnchors(paceMinPerKm: number): number[] {
  // Synthetic bands around current pace when athlete zones are missing
  return [
    paceMinPerKm * 1.18,
    paceMinPerKm * 1.05,
    paceMinPerKm * 0.95,
    paceMinPerKm * 0.85,
  ]
}
