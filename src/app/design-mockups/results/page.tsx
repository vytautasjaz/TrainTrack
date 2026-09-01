import { redirect } from 'next/navigation'

/** Results lives under Stats — keep old mock URL working. */
export default function ResultsMockRedirectPage() {
  redirect('/design-mockups/stats#race-results')
}
