/** Document attribute + event for Month calendar focus / expand mode. */

export const CALENDAR_EXPANDED_ATTR = 'data-calendar-expanded'
export const CALENDAR_EXPAND_EVENT = 'tt-calendar-expand'

export type CalendarExpandDetail = { expanded: boolean }

export function setCalendarExpanded(expanded: boolean) {
  if (typeof document === 'undefined') return
  if (expanded) {
    document.documentElement.setAttribute(CALENDAR_EXPANDED_ATTR, 'true')
  } else {
    document.documentElement.removeAttribute(CALENDAR_EXPANDED_ATTR)
  }
  window.dispatchEvent(
    new CustomEvent<CalendarExpandDetail>(CALENDAR_EXPAND_EVENT, {
      detail: { expanded },
    }),
  )
}

export function isCalendarExpanded(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.getAttribute(CALENDAR_EXPANDED_ATTR) === 'true'
}
