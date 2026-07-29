'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { LibrarySort } from '@/lib/workout-library/types'
import type { SessionType } from '@prisma/client'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import type { WorkoutType } from '@prisma/client'

type WorkoutLibraryFiltersProps = {
  sport?: WorkoutType
  sessionTypes?: SessionType[]
}

export function WorkoutLibraryFilters({ sport, sessionTypes = [] }: WorkoutLibraryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const sort = (searchParams.get('sort') as LibrarySort) || 'title'
  const session = searchParams.get('session') ?? 'all'

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key)
      else params.set(key, value)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-[200px] flex-1 sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          defaultValue={query}
          placeholder="Search workouts…"
          className="pl-9"
          onChange={(e) => updateParams({ q: e.target.value.trim() || null })}
        />
      </div>
      <Select
        value={sort}
        onChange={(e) => updateParams({ sort: e.target.value === 'title' ? null : e.target.value })}
        className="w-full sm:w-auto sm:min-w-[140px]"
      >
        <option value="title">Sort: Title</option>
        <option value="updated">Sort: Recently updated</option>
        <option value="session">Sort: Session type</option>
      </Select>
      {sessionTypes.length > 0 && sport && (
        <Select
          value={session}
          onChange={(e) => updateParams({ session: e.target.value === 'all' ? null : e.target.value })}
          className="w-full sm:w-auto sm:min-w-[160px]"
        >
          <option value="all">All session types</option>
          {sessionTypes.map((st) => (
            <option key={st} value={st}>
              {getSessionTypeLabel(st, sport)}
            </option>
          ))}
        </Select>
      )}
    </div>
  )
}
