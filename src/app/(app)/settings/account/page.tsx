import { redirect } from 'next/navigation'

/** Legacy route — unified settings live at /settings. */
export default function ProfileSettingsRedirect() {
  redirect('/settings#profile')
}
