/** Chart and data-viz colors — mirror CSS vars in globals.css for JS consumers (e.g. Recharts). */
export const chartColors = {
  brand: 'var(--color-chart-brand)',
  planned: 'var(--color-chart-planned)',
  success: 'var(--color-chart-success)',
} as const

export const sportColors = {
  swim: 'var(--color-sport-swim)',
  bike: 'var(--color-sport-bike)',
  run: 'var(--color-sport-run)',
} as const
