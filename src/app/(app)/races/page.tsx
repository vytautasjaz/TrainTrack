import { redirect } from 'next/navigation'

/** Legacy URL — season plan lives at /season. */
export default function RacesRedirectPage() {
  redirect('/season')
}
