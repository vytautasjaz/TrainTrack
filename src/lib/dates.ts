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

/** Add calendar months to a UTC date-only value (day clamped if needed). */
export function addDateOnlyMonths(date: Date, months: number): Date {
  const d = parseDateOnly(toDateKey(date))
  const day = d.getUTCDate()
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target
}

/** Stable YYYY-MM-DD key for a DB date field returned by Prisma. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Calendar YYYY-MM-DD for week math.
 * UTC midnight (Prisma DATE) → ISO key; otherwise local calendar day
 * (avoids local midnight in UTC+ becoming the previous UTC day).
 */
function toCalendarDateKey(date: Date): string {
  const utcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  return utcMidnight ? toDateKey(date) : format(date, 'yyyy-MM-dd')
}

/**
 * Monday-start week containing `date` (UTC date-only).
 * Do not use date-fns startOfWeek on UTC DATE values — local TZ shifts the day.
 * Week always starts on Monday (ISO).
 */
export function startOfWeekDateOnly(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const d = parseDateOnly(toCalendarDateKey(date))
  const day = d.getUTCDay() // 0 Sun … 6 Sat
  const diff =
    weekStartsOn === 1
      ? day === 0
        ? -6
        : 1 - day
      : -day
  return addDateOnlyDays(d, diff)
}

/** Inclusive Sunday (Mon-start) or Saturday (Sun-start) of the week. */
export function endOfWeekDateOnly(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  return addDateOnlyDays(startOfWeekDateOnly(date, weekStartsOn), 6)
}

export function startOfMonthDateOnly(date: Date): Date {
  const d = parseDateOnly(toDateKey(date))
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

export function endOfMonthDateOnly(date: Date): Date {
  const d = parseDateOnly(toDateKey(date))
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
}

/** Local Date for formatting labels from a UTC date-only value (no TZ drift). */
export function labelDateFromDateOnly(date: Date): Date {
  const [y, m, d] = toDateKey(date).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** date-fns format for a UTC date-only value. */
export function formatDateOnly(date: Date, pattern: string): string {
  return format(labelDateFromDateOnly(date), pattern)
}

/** Inclusive list of UTC date-only days from start through end. */
export function eachDateOnlyDay(start: Date, end: Date): Date[] {
  const days: Date[] = []
  let cursor = parseDateOnly(toDateKey(start))
  const last = parseDateOnly(toDateKey(end))
  while (cursor.getTime() <= last.getTime()) {
    days.push(cursor)
    cursor = addDateOnlyDays(cursor, 1)
  }
  return days
}

/** Compact calendar label for badges (e.g. Mar 12). */
export function formatDateKeyCompact(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return format(new Date(y, m - 1, d), 'MMM d')
}

/** Human-readable label for a YYYY-MM-DD date key. */
export function formatDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return format(new Date(y, m - 1, d), 'EEE, MMM d')
}
