import { redirect } from 'next/navigation'

/** Results lives under Stats — keep old URL working. */
export default function ResultsRedirectPage() {
  redirect('/progress#race-results')
}
