/** Downsample a parallel time series for compact feed charts. */
export function downsampleStreamSeries(
  values: number[],
  time: number[] | null,
  maxPoints = 120,
  companion: number[] | null = null,
): { values: number[]; time: number[]; companion: number[] | null } {
  const n = values.length
  if (n === 0) return { values: [], time: [], companion: null }

  const hasTime = Boolean(time && time.length === n)
  const hasCompanion = Boolean(companion && companion.length === n)

  if (n <= maxPoints) {
    return {
      values: [...values],
      time: hasTime ? [...time!] : values.map((_, i) => i),
      companion: hasCompanion ? [...companion!] : null,
    }
  }

  const outValues: number[] = []
  const outTime: number[] = []
  const outCompanion: number[] | null = hasCompanion ? [] : null
  const step = (n - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step)
    outValues.push(values[idx]!)
    outTime.push(hasTime ? time![idx]! : idx)
    if (outCompanion) outCompanion.push(companion![idx]!)
  }
  return { values: outValues, time: outTime, companion: outCompanion }
}

export type WorkoutStreamChartKind = 'power' | 'hr' | 'elevation'

export type WorkoutStreamChartPayload = {
  kind: WorkoutStreamChartKind
  values: number[]
  time: number[]
  unit: string
  label: string
  color: string
}
