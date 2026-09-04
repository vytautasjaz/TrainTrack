import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession, isAdmin, isAdminOnly } from '@/lib/session'
import { signOutAction } from '@/app/actions/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!isAdmin(session)) redirect('/dashboard')

  const showAppLink = !isAdminOnly(session)

  return (
    <div className="min-h-dvh bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink,#111)]">
      <header className="border-b border-[var(--tt-line,#ebebeb)] bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm font-semibold tracking-tight text-[var(--tt-ink,#111)]"
            >
              TrainTrack Admin
            </Link>
            <nav className="flex items-center gap-3 text-xs font-medium text-[var(--tt-ink-soft,#6b6b6b)]">
              <Link href="/admin" className="hover:text-[var(--tt-ink,#111)]">
                Users
              </Link>
              {showAppLink ? (
                <Link href="/dashboard" className="hover:text-[var(--tt-ink,#111)]">
                  Back to app
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
            <span className="hidden sm:inline">{session.name}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-[6px] px-2 py-1 font-medium hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink,#111)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
