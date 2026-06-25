export function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDisplayDate(dateStr: string): string {
  return parseDateLocal(dateStr).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortDate(dateStr: string): string {
  return parseDateLocal(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const current = new Date(date)
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const start = new Date(current)
  start.setDate(current.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function getWeekBoundsForOffset(weekOffset: number, fromDate = new Date()): { start: Date; end: Date } {
  const date = new Date(fromDate)
  date.setDate(date.getDate() + weekOffset * 7)
  return getWeekBounds(date)
}

export function getWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'This week'
  if (weekOffset === -1) return 'Last week'
  if (weekOffset === 1) return 'Next week'
  return 'Week summary'
}

export function formatWeekRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth()
  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const endLabel = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

const WEEKDAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

export function getWeekDayDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + index)
    return day
  })
}

export function getWeekdayShortLabel(date: Date): string {
  const mondayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1
  return WEEKDAY_SHORT[mondayIndex]
}

export function formatDuration(totalMin: number): string {
  if (totalMin <= 0) return '0 min'
  if (totalMin < 60) return `${Math.round(totalMin)} min`
  const hours = Math.floor(totalMin / 60)
  const minutes = Math.round(totalMin % 60)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export function formatDistance(km: number): string {
  if (km <= 0) return '0 km'
  return `${km % 1 === 0 ? km : km.toFixed(1)} km`
}
