import type { MetricEnvelope, MetricTrend, ToleranceRange } from './types'

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function clamp01(n: number): number {
  return clamp(n, 0, 1)
}

export function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function envelope(
  value: number,
  confidence: number,
  trend: MetricTrend,
  asOf: string,
  previousValue?: number | null,
): MetricEnvelope {
  return {
    value: Math.round(value * 10) / 10,
    confidence: Math.round(clamp01(confidence) * 100) / 100,
    trend,
    lastUpdated: asOf,
    previousValue: previousValue ?? null,
  }
}

export function tolerance(
  current: number,
  optimal: number,
  upperLimit: number,
  confidence: number,
  trend: MetricTrend,
  asOf: string,
): ToleranceRange {
  return {
    current: Math.round(current * 10) / 10,
    optimal: Math.round(optimal * 10) / 10,
    upperLimit: Math.round(upperLimit * 10) / 10,
    confidence: Math.round(clamp01(confidence) * 100) / 100,
    trend,
    lastUpdated: asOf,
  }
}

export function trendFromDelta(
  recent: number,
  older: number,
  threshold = 0.08,
): MetricTrend {
  if (older <= 0) return 'stable'
  const delta = (recent - older) / older
  if (delta > threshold) return 'improving'
  if (delta < -threshold) return 'declining'
  return 'stable'
}

/** Map AthleteState performance trend into MetricTrend. */
export function mapStateTrend(
  t: 'improving' | 'stable' | 'declining' | 'unknown',
): MetricTrend {
  if (t === 'improving' || t === 'stable' || t === 'declining') return t
  return 'stable'
}
