'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Library } from 'lucide-react'
import { LIBRARY_SPORTS } from '@/lib/workout-library/config'
import { cn } from '@/lib/utils'

export function WorkoutLibraryNav() {
  const pathname = usePathname()
  const isHub = pathname === '/workouts'
  const isLibrary = pathname.startsWith('/workouts/library')

  if (!isHub && !isLibrary && !pathname.startsWith('/workouts/swim')) {
    return null
  }

  return (
    <nav
      aria-label="Workout library sports"
      className="mb-6 space-y-3"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Library className="h-4 w-4" />
        <Link
          href="/workouts"
          className={cn(
            'transition hover:text-foreground',
            isHub && 'text-brand',
          )}
        >
          All sports
        </Link>
      </div>
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {LIBRARY_SPORTS.map((sport) => {
          const href = `/workouts/library/${sport.slug}`
          const active = pathname === href || pathname.startsWith(`${href}/`)
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
