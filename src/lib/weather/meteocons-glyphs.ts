import clearDay from '@meteocons/svg-static/line/clear-day.svg'
import clearNight from '@meteocons/svg-static/line/clear-night.svg'
import cloudy from '@meteocons/svg-static/line/cloudy.svg'
import drizzle from '@meteocons/svg-static/line/drizzle.svg'
import fogDay from '@meteocons/svg-static/line/fog-day.svg'
import fogNight from '@meteocons/svg-static/line/fog-night.svg'
import partlyCloudyDay from '@meteocons/svg-static/line/partly-cloudy-day.svg'
import partlyCloudyNight from '@meteocons/svg-static/line/partly-cloudy-night.svg'
import rain from '@meteocons/svg-static/line/rain.svg'
import sleet from '@meteocons/svg-static/line/sleet.svg'
import snow from '@meteocons/svg-static/line/snow.svg'
import thunderstormsDay from '@meteocons/svg-static/line/thunderstorms-day.svg'
import thunderstormsNight from '@meteocons/svg-static/line/thunderstorms-night.svg'

export type MeteoconIconSlug =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'drizzle'
  | 'rain'
  | 'sleet'
  | 'snow'
  | 'thunderstorms-day'
  | 'thunderstorms-night'
  | 'fog-day'
  | 'fog-night'

const METEOCON_ICON_SRC: Record<MeteoconIconSlug, string> = {
  'clear-day': clearDay.src,
  'clear-night': clearNight.src,
  'partly-cloudy-day': partlyCloudyDay.src,
  'partly-cloudy-night': partlyCloudyNight.src,
  cloudy: cloudy.src,
  drizzle: drizzle.src,
  rain: rain.src,
  sleet: sleet.src,
  snow: snow.src,
  'thunderstorms-day': thunderstormsDay.src,
  'thunderstorms-night': thunderstormsNight.src,
  'fog-day': fogDay.src,
  'fog-night': fogNight.src,
}

const LEGACY_GLYPH_TO_ICON: Record<string, MeteoconIconSlug> = {
  clear: 'clear-day',
  partly: 'partly-cloudy-day',
  cloud: 'cloudy',
  rain: 'rain',
  sleet: 'sleet',
  snow: 'snow',
  thunder: 'thunderstorms-day',
  fog: 'fog-day',
  unknown: 'cloudy',
}

function periodFromSymbol(symbol: string): 'day' | 'night' {
  if (symbol.includes('night') || symbol.includes('polartwilight')) return 'night'
  return 'day'
}

export function yrSymbolToMeteoconIcon(symbol: string | undefined): MeteoconIconSlug {
  if (!symbol) return 'cloudy'

  const s = symbol.toLowerCase()
  const period = periodFromSymbol(s)

  if (s.includes('thunder')) {
    return period === 'night' ? 'thunderstorms-night' : 'thunderstorms-day'
  }
  if (s.includes('snow')) return 'snow'
  if (s.includes('sleet')) return 'sleet'
  if (s.includes('rain') || s.includes('showers')) {
    if (s.includes('light') || s.includes('drizzle')) return 'drizzle'
    return 'rain'
  }
  if (s.includes('fog')) {
    return period === 'night' ? 'fog-night' : 'fog-day'
  }
  if (s.includes('partly') || s.includes('fair')) {
    return period === 'night' ? 'partly-cloudy-night' : 'partly-cloudy-day'
  }
  if (s.includes('cloud')) return 'cloudy'
  if (s.includes('clear')) {
    return period === 'night' ? 'clear-night' : 'clear-day'
  }

  return 'cloudy'
}

export function resolveMeteoconIconSlug(glyphOrSlug: string): MeteoconIconSlug | null {
  if (!glyphOrSlug || glyphOrSlug === '—') return null
  if (glyphOrSlug in METEOCON_ICON_SRC) return glyphOrSlug as MeteoconIconSlug
  return LEGACY_GLYPH_TO_ICON[glyphOrSlug] ?? 'cloudy'
}

export function resolveMeteoconIconSrc(glyphOrSlug: string): string | null {
  const slug = resolveMeteoconIconSlug(glyphOrSlug)
  if (!slug) return null
  return METEOCON_ICON_SRC[slug]
}

export function weatherIconAccessibilityLabel(glyphOrSlug: string): string {
  const slug = resolveMeteoconIconSlug(glyphOrSlug)
  if (!slug) return ''

  if (slug.startsWith('clear')) return 'sun'
  if (slug.startsWith('partly-cloudy')) return 'partly cloudy'
  if (slug === 'cloudy') return 'cloudy'
  if (slug === 'drizzle') return 'drizzle'
  if (slug === 'rain') return 'rain'
  if (slug === 'sleet') return 'sleet'
  if (slug === 'snow') return 'snow'
  if (slug.startsWith('thunderstorms')) return 'thunder'
  if (slug.startsWith('fog')) return 'fog'
  return ''
}
