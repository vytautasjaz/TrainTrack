'use client'

import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'

type SwimLibrarySearchProps = {
  initialQuery: string
}

export function SwimLibrarySearch({ initialQuery }: SwimLibrarySearchProps) {
  const router = useRouter()

  return (
    <Input
      type="search"
      defaultValue={initialQuery}
      placeholder="Search templates…"
      className="max-w-sm"
      onChange={(e) => {
        const q = e.target.value.trim()
        router.replace(q ? `/workouts/swim?q=${encodeURIComponent(q)}` : '/workouts/swim')
      }}
    />
  )
}
