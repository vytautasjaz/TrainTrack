import { format } from 'date-fns'

/** Parse YYYY-MM-DD as a UTC calendar date (matches PostgreSQL DATE + Prisma). */
export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Today's calendar date as YYYY-MM-DD in local timezone. */
export function todayDateKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** UTC midnight for today's local calendar date — use for DB date equality. */
export function todayDateOnly(): Date {
  return parseDateOnly(todayDateKey())
}

/** Add calendar days to a UTC date-only value (PostgreSQL DATE safe). */
export function addDateOnlyDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Stable YYYY-MM-DD key for a DB date field returned by Prisma. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Human-readable label for a YYYY-MM-DD date key. */
export function formatDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return format(new Date(y, m - 1, d), 'EEE, MMM d')
}
