import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { WorkoutLibraryNav } from '@/components/workout-library/workout-library-nav'

export default async function WorkoutsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.role !== 'COACH') {
    return <>{children}</>
  }

  return (
    <div>
      <WorkoutLibraryNav />
      {children}
    </div>
  )
}
