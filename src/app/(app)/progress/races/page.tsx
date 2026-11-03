import { redirect } from 'next/navigation'

/** Merged into Results — keep old URL working. */
export default function ProgressRacesRedirectPage() {
  redirect('/progress/results#race-results')
}
