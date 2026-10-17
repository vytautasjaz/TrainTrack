/** Pete Riegel (1977) race-equivalence exponent. */
export const RIEGEL_EXPONENT = 1.06

/** Riegel published range upper bound (minutes). */
export const RIEGEL_MAX_MINUTES = 230

export type PredictionConfidence = 'high' | 'medium' | 'low'

export type PredictionConfidenceMeta = {
  band: PredictionConfidence
  label: string
  /** max(D1,D2) / min(D1,D2) */
  ratio: number
}

/**
 * Predict equivalent race time: T2 = T1 × (D2 ÷ D1)^1.06
 * Distances must share the same unit (km or miles).
 */
export function riegelPredictMinutes(
  t1Minutes: number,
  d1: number,
  d2: number,
  exponent = RIEGEL_EXPONENT,
): number | null {
  if (
    !Number.isFinite(t1Minutes) ||
    !Number.isFinite(d1) ||
    !Number.isFinite(d2) ||
    t1Minutes <= 0 ||
    d1 <= 0 ||
    d2 <= 0
  ) {
    return null
  }
  if (Math.abs(d1 - d2) < 1e-9) return t1Minutes
  return t1Minutes * (d2 / d1) ** exponent
}

/** Distance ratio used for confidence (≥ 1). */
export function predictionDistanceRatio(d1: number, d2: number): number | null {
  if (!Number.isFinite(d1) || !Number.isFinite(d2) || d1 <= 0 || d2 <= 0) return null
  const lo = Math.min(d1, d2)
  const hi = Math.max(d1, d2)
  return hi / lo
}

/**
 * Closer known distance → better prediction.
 * high: ratio ≤ 2 · medium: ≤ 4.5 · low: > 4.5
 */
export function predictionConfidence(d1: number, d2: number): PredictionConfidenceMeta | null {
  const ratio = predictionDistanceRatio(d1, d2)
  if (ratio == null) return null

  let band: PredictionConfidence
  if (ratio <= 2) band = 'high'
  else if (ratio <= 4.5) band = 'medium'
  else band = 'low'

  const label =
    band === 'high' ? 'High' : band === 'medium' ? 'Reasonable' : 'Low'

  return { band, label, ratio }
}

export function isOutsideRiegelRange(predictedMinutes: number): boolean {
  return Number.isFinite(predictedMinutes) && predictedMinutes > RIEGEL_MAX_MINUTES
}

export type PredictionQuality = PredictionConfidenceMeta & {
  /** Extra caveats under the band label (no band name). */
  detail: string | null
  outsideRange: boolean
}

/** Structured quality for UI badges. */
export function predictionQuality(
  d1: number,
  d2: number,
  predictedMinutes: number | null,
  knownRaceLabel?: string | null,
): PredictionQuality | null {
  const meta = predictionConfidence(d1, d2)
  if (meta == null) return null

  const details: string[] = []
  if (meta.band === 'medium') {
    details.push('Closer races predict better')
  } else if (meta.band === 'low') {
    const from = knownRaceLabel?.trim() || 'your known race'
    details.push(`Far from ${from}`)
  }

  const outsideRange =
    predictedMinutes != null && isOutsideRiegelRange(predictedMinutes)
  if (outsideRange) {
    details.push('Outside Riegel’s 3.5–230 min range')
  }

  return {
    ...meta,
    detail: details.length > 0 ? details.join(' · ') : null,
    outsideRange,
  }
}

/** Caption for a prediction card (confidence + optional caveats). */
export function predictionCaption(
  d1: number,
  d2: number,
  predictedMinutes: number | null,
  knownRaceLabel?: string | null,
): string | null {
  const quality = predictionQuality(d1, d2, predictedMinutes, knownRaceLabel)
  if (quality == null) return null
  return quality.detail ? `${quality.label} · ${quality.detail}` : quality.label
}
