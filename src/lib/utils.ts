import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null || km <= 0) return '—'
  return `${km % 1 === 0 ? km : km.toFixed(1)} km`
}

export function formatDuration(min: number | null | undefined): string {
  if (min == null || min <= 0) return '—'
  const total = Math.round(min)
  if (total <= 0) return '—'
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function daysUntil(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function percent(n: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((n / total) * 100)
}
