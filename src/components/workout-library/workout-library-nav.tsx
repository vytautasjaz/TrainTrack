'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Library } from 'lucide-react'
import { LIBRARY_SPORTS } from '@/lib/workout-library/config'
import { cn } from '@/lib/utils'

/**
 * Compact sport chips for template builder routes.
 * Standalone Library (`/workouts`) owns its own sport tabs.
 */
export function WorkoutLibraryNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isHub = pathname === '/workouts'
  const isBuilder =
    pathname.startsWith('/workouts/templates') ||
    pathname.startsWith('/workouts/builder') ||
    pathname.startsWith('/workouts/swim')

  if (isHub || (!isBuilder && !pathname.startsWith('/workouts/library'))) {
    return null
  }

  const sportParam = searchParams.get('sport')?.toLowerCase()

  return (
    <nav aria-label="Workout library sports" className="mb-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Library className="h-4 w-4" />
        <Link
          href="/workouts"
          className={cn('transition hover:text-foreground', isHub && 'text-brand')}
        >
          Library
        </Link>
      </div>
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {LIBRARY_SPORTS.map((sport) => {
          const href = `/workouts?sport=${sport.slug}`
          const active = sportParam === sport.slug
          return (
            <Link
              key={sport.slug}
              href={href}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition',
                active
                  ? 'bg-brand/10 text-brand'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {sport.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
