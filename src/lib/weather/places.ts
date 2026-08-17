export type WeatherPlace = {
  id: string
  name: string
  label: string
  lat: number
  lon: number
  country: string | null
  region: string | null
}

export type WeatherSlotSummary = {
  label: 'Morning' | 'Day' | 'Evening'
  emoji: string
  temperatureC: number | null
  precipitationProbability: number | null
  precipitationMm: number | null
}

export type WeatherDaySummary = {
  dateKey: string
  slots: WeatherSlotSummary[]
}

export function formatWeatherPlaceLabel(opts: {
  name: string
  region?: string | null
  country?: string | null
}): string {
  const parts = [opts.name]
  if (opts.region && opts.region !== opts.name) parts.push(opts.region)
  if (opts.country && opts.country !== opts.name) parts.push(opts.country)
  return parts.join(', ')
}

export function formatWeatherPrecip(slot: WeatherSlotSummary): string {
  if (slot.precipitationProbability != null && slot.precipitationProbability >= 20) {
    return `${slot.precipitationProbability}%`
  }
  if (slot.precipitationMm != null && slot.precipitationMm >= 0.2) {
    return `${slot.precipitationMm.toFixed(1)}mm`
  }
  return ''
}

export function formatWeatherSlotLine(slot: WeatherSlotSummary): string | null {
  if (slot.temperatureC == null && !formatWeatherPrecip(slot)) {
    return null
  }
  const temp = slot.temperatureC != null ? `${slot.temperatureC}°` : ''
  return [slot.label, slot.emoji, temp, formatWeatherPrecip(slot)].filter(Boolean).join(' ')
}
