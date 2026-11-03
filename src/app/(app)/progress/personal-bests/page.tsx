import { redirect } from 'next/navigation'

/** Merged into Results — keep old URL working. */
export default function ProgressPersonalBestsRedirectPage() {
  redirect('/progress/results#personal-bests')
}
