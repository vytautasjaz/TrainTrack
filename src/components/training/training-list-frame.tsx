'use client'

import {
  useLayoutEffect,
  useRef,
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
  /** Week (and similar): body scrolls under the sticky chrome. List keeps inner scroll. */
  scrollBody = false,
}: {
  header: ReactNode
  children: ReactNode
  className?: string
  scrollBody?: boolean
}) {
  const [frameStyle, setFrameStyle] = useState<CSSProperties | undefined>()
  const [spacerHeight, setSpacerHeight] = useState<number | null>(null)
  const [desktopStickyTop, setDesktopStickyTop] = useState(0)
  const lastMetricsRef = useRef<{ top: number; bottom: number } | null>(null)

  useLayoutEffect(() => {
    function measure() {
      const isMobile = window.matchMedia('(max-width: 1023px)').matches
      const chrome = document.querySelector<HTMLElement>('[data-app-sticky-chrome]')
      const chromeBottom = Math.round(
        chrome?.getBoundingClientRect().bottom ?? 0,
      )

      if (!isMobile) {
        lastMetricsRef.current = null
        setFrameStyle(undefined)
        setSpacerHeight(null)
        setDesktopStickyTop(Math.max(0, chromeBottom))
        return
      }

      const bottomNav = document.querySelector<HTMLElement>(
        '[data-mobile-bottom-nav]',
      )
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

      const prev = lastMetricsRef.current
      if (prev && prev.top === top && prev.bottom === bottom) return
      lastMetricsRef.current = { top, bottom }

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

    // One post-paint pass for late layout (fonts / bottom nav), not a mutation loop.
    const retryId = window.requestAnimationFrame(() => measure())

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      mq.removeEventListener('change', measure)
      window.cancelAnimationFrame(retryId)
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
            /*
             * Above week/month sticky columns (z-20/21) so filter popovers and
             * chrome aren’t painted over by day “+” controls in the table.
             * Stay below mobile top bar (z-40).
             */
            'tt-training-list-sticky-header relative z-30 shrink-0 bg-background',
            /*
             * Mobile inset matches List (px-2.5). Keep identical before/after
             * fixed positioning so header margins don’t jump on hydrate.
             */
            'max-lg:border-b max-lg:border-[var(--tt-line,#ebebeb)] max-lg:px-2.5 max-lg:pb-2 max-lg:pt-1',
            mobileFixed
              ? null
              : 'sticky z-30 lg:-mx-4 lg:border-0 lg:px-4 lg:pb-5 lg:pt-2',
          )}
          style={!mobileFixed ? { top: desktopStickyTop } : undefined}
        >
          {header}
          {mobileFixed ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-full z-20 h-3 bg-gradient-to-b from-black/[0.06] to-transparent"
            />
          ) : null}
        </div>
        <div
          className={cn(
            'min-h-0 min-w-0',
            mobileFixed
              ? cn(
                  'flex min-h-0 flex-1 flex-col',
                  scrollBody
                    ? 'overflow-y-auto overflow-x-hidden'
                    : 'overflow-hidden',
                )
              : 'mt-0',
          )}
        >
          {mobileFixed && !scrollBody ? (
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
