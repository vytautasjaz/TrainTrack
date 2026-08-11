import { toPng } from 'html-to-image'
import type { WorkoutBlockDensity } from '@/components/workout-block'

/** Stable export widths so PNG size does not depend on parent layout. */
export const EXPORT_CARD_WIDTH_PX: Record<WorkoutBlockDensity, number> = {
  xs: 160,
  sm: 200,
  md: 240,
  lg: 300,
}

export const EXPORT_DENSITIES: WorkoutBlockDensity[] = ['xs', 'sm', 'md', 'lg']

export type ExportTextColor = 'white' | 'black'
export type ExportBackground = 'transparent' | 'white' | 'black' | 'semi'

export const EXPORT_TEXT_COLORS: ExportTextColor[] = ['white', 'black']

/** Backgrounds that never match the text color (same-color combos excluded). */
export function backgroundsForText(text: ExportTextColor): ExportBackground[] {
  if (text === 'white') return ['transparent', 'black', 'semi']
  return ['transparent', 'white', 'semi']
}

export function isValidExportCombo(
  text: ExportTextColor,
  background: ExportBackground,
): boolean {
  return backgroundsForText(text).includes(background)
}

/** If current bg conflicts with text, fall back to transparent. */
export function coerceExportBackground(
  text: ExportTextColor,
  background: ExportBackground,
): ExportBackground {
  return isValidExportCombo(text, background) ? background : 'transparent'
}

export function exportCardBackground(
  text: ExportTextColor,
  background: ExportBackground,
): string {
  switch (background) {
    case 'white':
      return '#ffffff'
    case 'black':
      return '#0a0a0a'
    case 'semi':
      return text === 'white' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'
    case 'transparent':
    default:
      return 'transparent'
  }
}

export function exportCardBorderColor(text: ExportTextColor): string {
  return text === 'white' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(10, 10, 10, 0.85)'
}

export function exportCardTextColor(text: ExportTextColor): string {
  return text === 'white' ? '#ffffff' : '#0a0a0a'
}

export function slugifyWorkoutTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'workout'
}

export function workoutCardExportFilename(
  title: string,
  density: WorkoutBlockDensity,
): string {
  return `traintrack-${slugifyWorkoutTitle(title)}-${density}.png`
}

export async function captureWorkoutCardPng(node: HTMLElement): Promise<string> {
  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    // Avoid reading cross-origin stylesheets (e.g. Google Fonts) — triggers
    // SecurityError on CSSStyleSheet.cssRules in Firefox/Safari.
    skipFonts: true,
    // Keep card surface alpha; leave outside pixels transparent for overlays.
    backgroundColor: undefined,
  })
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function copyDataUrlToClipboard(dataUrl: string): Promise<boolean> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return false
  }
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
  return true
}
