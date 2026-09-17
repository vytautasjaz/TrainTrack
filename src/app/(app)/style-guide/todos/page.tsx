import { redirect } from 'next/navigation'

/** Backlog lives under admin so pure admin accounts can open it. */
export default function StyleGuideTodosRedirectPage() {
  redirect('/admin/todos')
}
