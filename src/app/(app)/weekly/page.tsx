import { redirect } from 'next/navigation'

type WeeklyPageProps = {
  searchParams: Promise<{ week?: string }>
}

export default async function WeeklyPage({ searchParams }: WeeklyPageProps) {
  const params = await searchParams
  const week = params.week ?? '0'
  redirect(`/training?view=week&week=${week}`)
}
