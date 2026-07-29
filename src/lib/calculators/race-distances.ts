export type RunningPresetId = '5k' | '10k' | 'half' | 'marathon'

export type TriathlonPresetId = 'sprint' | 'olympic' | 'half' | 'ironman'

export const RUNNING_PRESETS: { id: RunningPresetId; label: string; distanceKm: number }[] = [
  { id: '5k', label: '5K', distanceKm: 5 },
  { id: '10k', label: '10K', distanceKm: 10 },
  { id: 'half', label: 'Half marathon', distanceKm: 21.0975 },
  { id: 'marathon', label: 'Marathon', distanceKm: 42.195 },
]

export const TRIATHLON_PRESETS: {
  id: TriathlonPresetId
  label: string
  swimKm: number
  bikeKm: number
  runKm: number
}[] = [
  { id: 'sprint', label: 'Sprint', swimKm: 0.75, bikeKm: 20, runKm: 5 },
  { id: 'olympic', label: 'Olympic', swimKm: 1.5, bikeKm: 40, runKm: 10 },
  { id: 'half', label: 'Half Ironman', swimKm: 1.9, bikeKm: 90, runKm: 21.0975 },
  { id: 'ironman', label: 'Ironman', swimKm: 3.8, bikeKm: 180, runKm: 42.195 },
]
