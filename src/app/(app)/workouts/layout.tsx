import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSession, isCoachView } from '@/lib/session'
import { WorkoutLibraryNav } from '@/components/workout-library/workout-library-nav'

export default async function WorkoutsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!isCoachView(session)) {
    return <>{children}</>
  }

  return (
    <div>
      <Suspense fallback={null}>
        <WorkoutLibraryNav />
      </Suspense>
      {children}
    </div>
  )
}
