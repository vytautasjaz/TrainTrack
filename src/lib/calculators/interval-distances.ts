export type IntervalPresetId =
  | '100'
  | '200'
  | '400'
  | '800'
  | '1000'
  | '1500'
  | '2000'
  | '3000'
  | '5000'

export const INTERVAL_PRESETS: { id: IntervalPresetId; label: string; distanceM: number }[] = [
  { id: '100', label: '100 m', distanceM: 100 },
  { id: '200', label: '200 m', distanceM: 200 },
  { id: '400', label: '400 m', distanceM: 400 },
  { id: '800', label: '800 m', distanceM: 800 },
  { id: '1000', label: '1000 m', distanceM: 1000 },
  { id: '1500', label: '1500 m', distanceM: 1500 },
  { id: '2000', label: '2000 m', distanceM: 2000 },
  { id: '3000', label: '3000 m', distanceM: 3000 },
  { id: '5000', label: '5000 m', distanceM: 5000 },
]
