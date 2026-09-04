'use client'

import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react'
import { resolveMeteoconIconSlug, resolveMeteoconIconSrc } from '@/lib/weather/meteocons-glyphs'
import { cn } from '@/lib/utils'

type WeatherGlyphProps = {
  glyph: string
  className?: string
  tone?: WeatherGlyphTone
  colors?: Partial<WeatherGlyphColors>
  detail?: string
}

type WeatherGlyphColors = {
  primary: string
  accent: string
  secondary: string
}

export const WEATHER_GLYPH_TONES = {
  default: {
    primary: '#475569',
    accent: '#eab308',
    secondary: '#cbd5e1',
  },
  muted: {
    primary: '#6b7280',
    accent: '#d4a816',
    secondary: '#94a3b8',
  },
  slate: {
    primary: '#475569',
    accent: '#f59e0b',
    secondary: '#94a3b8',
  },
  monochrome: {
    primary: '#6b7280',
    accent: '#6b7280',
    secondary: '#94a3b8',
  },
  contrast: {
    primary: '#334155',
    accent: '#f59e0b',
    secondary: '#bfdbfe',
  },
} as const

export type WeatherGlyphTone = keyof typeof WEATHER_GLYPH_TONES

const SVG_CACHE = new Map<string, string>()

function tintMeteoconSvg(raw: string): string {
  return raw
    .replace('<svg ', '<svg class="h-full w-full" ')
    .replaceAll('#F8AF18', 'var(--weather-icon-accent)')
    .replaceAll('#F6A823', 'var(--weather-icon-accent)')
    .replaceAll('#0A5AD4', 'var(--weather-icon-primary)')
    .replaceAll('#2B84EA', 'var(--weather-icon-primary)')
    .replaceAll('#5CA8F5', 'var(--weather-icon-primary)')
    .replaceAll('#E6EFFC', 'var(--weather-icon-secondary)')
}

function namespaceSvgIds(svg: string, suffix: string): string {
  const ids = [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]).filter(Boolean)
  if (ids.length === 0) return svg

  let namespaced = svg
  for (const id of ids) {
    const nextId = `${id}-${suffix}`
    namespaced = namespaced
      .replaceAll(`id="${id}"`, `id="${nextId}"`)
      .replaceAll(`url(#${id})`, `url(#${nextId})`)
      .replaceAll(`href="#${id}"`, `href="#${nextId}"`)
      .replaceAll(`xlink:href="#${id}"`, `xlink:href="#${nextId}"`)
  }
  return namespaced
}

function iconLabelFromGlyph(glyph: string): string {
  const slug = resolveMeteoconIconSlug(glyph)
  if (!slug) return 'weather'
  const name = slug.replaceAll('-', ' ')
  return name.replace(/\b\w/g, (m) => m.toUpperCase())
}

export function WeatherGlyph({ glyph, className, tone = 'default', colors, detail }: WeatherGlyphProps) {
  const src = resolveMeteoconIconSrc(glyph)
  const slug = resolveMeteoconIconSlug(glyph)
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null)
  const instanceId = useId().replace(/:/g, '')
  const basePalette = { ...WEATHER_GLYPH_TONES[tone], ...colors }
  const palette =
    slug === 'rain' || slug === 'drizzle'
      ? {
          ...basePalette,
          primary: '#1d4ed8',
          accent: '#1d4ed8',
          secondary: '#93c5fd',
        }
      : basePalette
  const iconLabel = iconLabelFromGlyph(glyph)
  const hoverText = detail ? `${iconLabel} · ${detail}` : iconLabel
  const renderedSvg = useMemo(
    () => (svgMarkup ? namespaceSvgIds(svgMarkup, instanceId) : null),
    [svgMarkup, instanceId],
  )

  useEffect(() => {
    let isActive = true
    if (!src) {
      return
    }
    const cached = SVG_CACHE.get(src)
    if (cached) {
      queueMicrotask(() => {
        if (isActive) setSvgMarkup(cached)
      })
      return
    }
    void fetch(src)
      .then((res) => res.text())
      .then((raw) => {
        if (!isActive) return
        const tinted = tintMeteoconSvg(raw)
        SVG_CACHE.set(src, tinted)
        setSvgMarkup(tinted)
      })
      .catch(() => {
        if (!isActive) return
        setSvgMarkup(null)
      })
    return () => {
      isActive = false
    }
  }, [src])

  if (!src || !renderedSvg) return null

  return (
    <span
      role="img"
      aria-label={hoverText}
      title={hoverText}
      className={cn('inline-flex h-7 w-7 shrink-0 self-center align-middle text-slate-500', className)}
      style={
        {
          '--weather-icon-primary': palette.primary,
          '--weather-icon-accent': palette.accent,
          '--weather-icon-secondary': palette.secondary,
        } as CSSProperties
      }
      dangerouslySetInnerHTML={{ __html: renderedSvg }}
    />
  )
}
