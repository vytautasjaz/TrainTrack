'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { setCalendarExpanded } from '@/lib/calendar-expand'
import { setLibraryDockOpen } from '@/lib/library-dock'

/**
 * Clear document chrome flags that hide the mobile bottom nav when leaving
 * the pages that own them (avoids sticky attributes after soft navigations).
 */
export function DocumentChromeCleanup() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname.startsWith('/training')) {
      setCalendarExpanded(false)
      setLibraryDockOpen(false)
    }
  }, [pathname])

  return null
}
