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

/** Compact UI label: "Vilnius, Vilnius City Municipality, Lithuania" → "Vilnius, LT". */
let countryCodeByName: Map<string, string> | null = null

function countryNameToCode(name: string): string | null {
  if (!countryCodeByName) {
    countryCodeByName = new Map()
    const display = new Intl.DisplayNames(['en'], { type: 'region' })
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b)
        const label = display.of(code)
        if (label && label !== code) {
          countryCodeByName.set(label.toLowerCase(), code)
        }
      }
    }
  }
  return countryCodeByName.get(name.trim().toLowerCase()) ?? null
}

export function formatWeatherLocationCompact(label: string): string {
  const parts = label
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return label
  const city = parts[0]!
  if (parts.length === 1) return city
  const country = parts[parts.length - 1]!
  if (country === city) return city
  if (/^[A-Z]{2}$/.test(country)) return `${city}, ${country}`
  const code = countryNameToCode(country)
  return code ? `${city}, ${code}` : `${city}, ${country}`
}

export function formatWeatherPrecip(slot: WeatherSlotSummary): string {
  if (slot.precipitationMm != null && slot.precipitationMm >= 0.2) {
    const mm =
      slot.precipitationMm >= 10
        ? `${Math.round(slot.precipitationMm)}mm`
        : `${slot.precipitationMm.toFixed(1)}mm`
    return mm
  }
  if (slot.precipitationProbability != null && slot.precipitationProbability >= 20) {
    return `${slot.precipitationProbability}%`
  }
  return ''
}

import { weatherIconAccessibilityLabel } from '@/lib/weather/meteocons-glyphs'

export function formatWeatherSlotLine(slot: WeatherSlotSummary): string | null {
  if (slot.temperatureC == null && !formatWeatherPrecip(slot)) {
    return null
  }
  const glyphLabel = weatherIconAccessibilityLabel(slot.emoji)
  const temp = slot.temperatureC != null ? `${slot.temperatureC}°` : ''
  return [slot.label, glyphLabel, temp, formatWeatherPrecip(slot)].filter(Boolean).join(' ')
}

