import type { ReactNode } from 'react'

/**
 * Design system: trailing period on page titles is brand orange.
 * Pass plain text ending in `.` — the final period is styled automatically.
 */
export function titleWithOrangeDot(text: string): ReactNode {
  const trimmed = text.trimEnd()
  if (!trimmed.endsWith('.')) return text
  return (
    <>
      {trimmed.slice(0, -1)}
      <span className="tt-title-dot">.</span>
    </>
  )
}

/** Always append a brand-orange trailing period (home / section topics). */
export function topicTitleWithOrangeDot(text: string): ReactNode {
  const base = text.trimEnd().replace(/\.$/, '')
  return (
    <>
      {base}
      <span className="tt-title-dot">.</span>
    </>
  )
}

/** Wrap children: if a string ending in `.`, orange-dot the period. */
export function withOrangeTitleDot(children: ReactNode): ReactNode {
  if (typeof children === 'string') return titleWithOrangeDot(children)
  return children
}
