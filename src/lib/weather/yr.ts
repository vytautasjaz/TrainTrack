import 'server-only'

import { formatWeatherPlaceLabel, type WeatherPlace, type WeatherSlotSummary, type WeatherDaySummary } from '@/lib/weather/places'

type YrTimeseriesEntry = {
  time: string
  data: {
    instant?: { details?: { air_temperature?: number } }
    next_1_hours?: {
      summary?: { symbol_code?: string }
      details?: {
        precipitation_amount?: number
        probability_of_precipitation?: number
      }
    }
    next_6_hours?: {
      summary?: { symbol_code?: string }
      details?: {
        precipitation_amount?: number
        probability_of_precipitation?: number
      }
    }
    next_12_hours?: {
      summary?: { symbol_code?: string }
      details?: { probability_of_precipitation?: number }
    }
  }
}

type YrResponse = {
  properties?: {
    timeseries?: YrTimeseriesEntry[]
  }
}

export type { WeatherSlotSummary, WeatherDaySummary }

type CachedForecast = {
  expiresAtMs: number
  body: YrResponse
}

const WEATHER_CACHE = new Map<string, CachedForecast>()
const WEATHER_TTL_FALLBACK_MS = 20 * 60 * 1000
const TARGET_HOURS_UTC = [
  { hour: 8, label: 'Morning' as const },
  { hour: 13, label: 'Day' as const },
  { hour: 18, label: 'Evening' as const },
]

function roundCoord(value: number): number {
  return Math.round(value * 10000) / 10000
}

function buildUserAgent(): string {
  const fromEnv = process.env.WEATHER_USER_AGENT?.trim()
  if (fromEnv) return fromEnv
  return 'TrainTrack/1.0 (https://traintrack.app; contact: support@traintrack.app)'
}

import { yrSymbolToMeteoconIcon } from '@/lib/weather/meteocons-glyphs'

function pickNearestEntry(
  entries: YrTimeseriesEntry[],
  dateKey: string,
  targetHourUtc: number,
): YrTimeseriesEntry | null {
  const dayEntries = entries.filter((entry) => entry.time.startsWith(`${dateKey}T`))
  if (dayEntries.length === 0) return null
  let best: YrTimeseriesEntry | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const entry of dayEntries) {
    const hour = new Date(entry.time).getUTCHours()
    const dist = Math.abs(hour - targetHourUtc)
    if (dist < bestDistance) {
      best = entry
      bestDistance = dist
    }
  }
  return best
}

function summarizeEntry(
  entry: YrTimeseriesEntry | null,
  label: 'Morning' | 'Day' | 'Evening',
): WeatherSlotSummary {
  if (!entry) {
    return {
      label,
      emoji: '—',
      temperatureC: null,
      precipitationProbability: null,
      precipitationMm: null,
    }
  }

  const temperatureRaw = entry.data.instant?.details?.air_temperature
  const probabilityRaw =
    entry.data.next_1_hours?.details?.probability_of_precipitation ??
    entry.data.next_6_hours?.details?.probability_of_precipitation ??
    entry.data.next_12_hours?.details?.probability_of_precipitation
  const precipMmRaw =
    entry.data.next_1_hours?.details?.precipitation_amount ??
    entry.data.next_6_hours?.details?.precipitation_amount
  const symbol =
    entry.data.next_1_hours?.summary?.symbol_code ??
    entry.data.next_6_hours?.summary?.symbol_code ??
    entry.data.next_12_hours?.summary?.symbol_code

  return {
    label,
    emoji: yrSymbolToMeteoconIcon(symbol),
    temperatureC:
      typeof temperatureRaw === 'number' && Number.isFinite(temperatureRaw)
        ? Math.round(temperatureRaw)
        : null,
    precipitationProbability:
      typeof probabilityRaw === 'number' && Number.isFinite(probabilityRaw)
        ? Math.max(0, Math.min(100, Math.round(probabilityRaw)))
        : null,
    precipitationMm:
      typeof precipMmRaw === 'number' && Number.isFinite(precipMmRaw)
        ? Math.round(precipMmRaw * 10) / 10
        : null,
  }
}

async function fetchForecast(lat: number, lon: number): Promise<YrResponse> {
  const roundedLat = roundCoord(lat)
  const roundedLon = roundCoord(lon)
  const cacheKey = `${roundedLat},${roundedLon}`
  const now = Date.now()
  const cached = WEATHER_CACHE.get(cacheKey)
  if (cached && cached.expiresAtMs > now) return cached.body

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${roundedLat}&lon=${roundedLon}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': buildUserAgent(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`)
  }

  const expiresHeader = response.headers.get('expires')
  const expiresAtMs = expiresHeader ? new Date(expiresHeader).getTime() : now + WEATHER_TTL_FALLBACK_MS
  const body = (await response.json()) as YrResponse
  WEATHER_CACHE.set(cacheKey, {
    expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : now + WEATHER_TTL_FALLBACK_MS,
    body,
  })
  return body
}

export async function getYrWeatherSummaries(opts: {
  lat: number
  lon: number
  dateKeys: string[]
}): Promise<Map<string, WeatherDaySummary>> {
  const uniqueDateKeys = [...new Set(opts.dateKeys)]
  if (uniqueDateKeys.length === 0) return new Map()
  const forecast = await fetchForecast(opts.lat, opts.lon)
  const entries = forecast.properties?.timeseries ?? []

  const output = new Map<string, WeatherDaySummary>()
  for (const dateKey of uniqueDateKeys) {
    const slots: WeatherSlotSummary[] = TARGET_HOURS_UTC.map(({ hour, label }) =>
      summarizeEntry(pickNearestEntry(entries, dateKey, hour), label),
    )
    output.set(dateKey, { dateKey, slots })
  }
  return output
}

type YrSuggestLocation = {
  id?: string
  name?: string
  category?: { id?: string; name?: string }
  position?: { lat?: number; lon?: number }
  country?: { name?: string }
  region?: { name?: string }
  subregion?: { name?: string }
}

type YrSuggestResponse = {
  _embedded?: { location?: YrSuggestLocation[] }
}

const LOCATION_CACHE = new Map<string, { expiresAtMs: number; places: WeatherPlace[] }>()
const LOCATION_TTL_MS = 10 * 60 * 1000

function categoryRank(categoryId: string | undefined): number {
  if (!categoryId) return 40
  if (categoryId.startsWith('CA') || categoryId.startsWith('PP') || categoryId.startsWith('CH')) {
    return 0
  }
  if (categoryId.startsWith('KG')) return 20
  if (categoryId.startsWith('EC')) return 80
  return 40
}

export async function searchYrLocations(query: string): Promise<WeatherPlace[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const cacheKey = q.toLowerCase()
  const now = Date.now()
  const cached = LOCATION_CACHE.get(cacheKey)
  if (cached && cached.expiresAtMs > now) return cached.places

  const url = `https://www.yr.no/api/v0/locations/suggest?language=en&q=${encodeURIComponent(q)}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': buildUserAgent(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Location search failed (${response.status})`)
  }

  const body = (await response.json()) as YrSuggestResponse
  const places = (body._embedded?.location ?? [])
    .map((loc) => {
      const lat = loc.position?.lat
      const lon = loc.position?.lon
      const name = loc.name?.trim()
      if (!name || typeof lat !== 'number' || typeof lon !== 'number') return null
      const country = loc.country?.name?.trim() || null
      const region = loc.subregion?.name?.trim() || loc.region?.name?.trim() || null
      return {
        id: loc.id ?? `${roundCoord(lat)},${roundCoord(lon)}`,
        name,
        label: formatWeatherPlaceLabel({ name, region, country }),
        lat: roundCoord(lat),
        lon: roundCoord(lon),
        country,
        region,
        rank: categoryRank(loc.category?.id),
      }
    })
    .filter((place): place is WeatherPlace & { rank: number } => place != null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8)
    .map((place) => ({
      id: place.id,
      name: place.name,
      label: place.label,
      lat: place.lat,
      lon: place.lon,
      country: place.country,
      region: place.region,
    }))

  LOCATION_CACHE.set(cacheKey, { expiresAtMs: now + LOCATION_TTL_MS, places })
  return places
}
