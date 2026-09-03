'use client'

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * Mobile list chrome: fixed frame from app top bar → bottom nav
 * so header + list share one column with no white gaps.
 * Desktop: normal flow with sticky header.
 */
export function TrainingListFrame({
  header,
  children,
  className,
}: {
  header: ReactNode
  children: ReactNode
  className?: string
}) {
  const [frameStyle, setFrameStyle] = useState<CSSProperties | undefined>()
  const [spacerHeight, setSpacerHeight] = useState<number | null>(null)
  const [desktopStickyTop, setDesktopStickyTop] = useState(0)

  useLayoutEffect(() => {
    function measure() {
      const isMobile = window.matchMedia('(max-width: 1023px)').matches
      const chrome = document.querySelector<HTMLElement>('[data-app-sticky-chrome]')
      const chromeBottom = Math.round(chrome?.getBoundingClientRect().bottom ?? 0)

      if (!isMobile) {
        setFrameStyle(undefined)
        setSpacerHeight(null)
        setDesktopStickyTop(Math.max(0, chromeBottom))
        return
      }

      const bottomNav = document.querySelector<HTMLElement>('[data-mobile-bottom-nav]')
      const top = chromeBottom

      let bottom = 0
      if (bottomNav) {
        const cs = window.getComputedStyle(bottomNav)
        if (cs.display !== 'none' && cs.visibility !== 'hidden') {
          const rect = bottomNav.getBoundingClientRect()
          if (rect.height > 0) {
            bottom = Math.max(0, Math.round(window.innerHeight - rect.top))
          }
        }
      }

      setFrameStyle({
        position: 'fixed',
        top,
        bottom,
        left: 0,
        right: 0,
      })
      setSpacerHeight(Math.max(180, window.innerHeight - top - bottom))
      setDesktopStickyTop(0)
    }

    measure()
    const ro = new ResizeObserver(measure)
    const chrome = document.querySelector('[data-app-sticky-chrome]')
    const bottomNav = document.querySelector('[data-mobile-bottom-nav]')
    if (chrome) ro.observe(chrome)
    if (bottomNav) ro.observe(bottomNav)
    window.addEventListener('resize', measure)
    const mq = window.matchMedia('(max-width: 1023px)')
    mq.addEventListener('change', measure)

    const bodyObserver = new MutationObserver(() => measure())
    bodyObserver.observe(document.body, { childList: true, subtree: true })
    const retryId = window.setTimeout(measure, 120)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      mq.removeEventListener('change', measure)
      bodyObserver.disconnect()
      window.clearTimeout(retryId)
    }
  }, [])

  const mobileFixed = frameStyle != null

  return (
    <>
      {spacerHeight != null ? (
        <div aria-hidden style={{ height: spacerHeight }} />
      ) : null}
      <div
        className={cn(
          'tt-training-list-frame flex flex-col bg-background',
          mobileFixed && 'z-20',
          !mobileFixed && 'min-h-0',
          className,
        )}
        style={frameStyle}
        data-training-list-frame={mobileFixed ? 'fixed' : 'flow'}
      >
        <div
          className={cn(
            'tt-training-list-sticky-header relative z-10 shrink-0 border-b border-[var(--tt-line,#ebebeb)] bg-background',
            mobileFixed ? 'px-4 pb-2 pt-1' : 'sticky z-20 -mx-4 px-4 pb-2',
          )}
          style={!mobileFixed ? { top: desktopStickyTop } : undefined}
        >
          {header}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-full z-20 h-3 bg-gradient-to-b from-black/[0.06] to-transparent"
          />
        </div>
        <div
          className={cn(
            'min-h-0 min-w-0',
            mobileFixed ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'mt-0',
          )}
        >
          {mobileFixed ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </>
  )
}
