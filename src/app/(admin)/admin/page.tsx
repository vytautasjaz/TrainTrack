import Link from 'next/link'
import {
  listAdminUsers,
  parseAdminUserSort,
  type AdminUserSortField,
} from '@/lib/admin'
import { requireAdmin } from '@/lib/session'
import { AdminUsersTable } from '@/components/admin/admin-users-table'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AdminPageProps = {
  searchParams?: Promise<{
    q?: string
    cursor?: string
    sort?: string
    dir?: string
  }>
}

function adminQuery(opts: {
  q?: string | null
  sort: string
  dir: string
  cursor?: string | null
}) {
  const params = new URLSearchParams()
  if (opts.q) params.set('q', opts.q)
  if (opts.sort !== 'created' || opts.dir !== 'desc') {
    params.set('sort', opts.sort)
    params.set('dir', opts.dir)
  }
  if (opts.cursor) params.set('cursor', opts.cursor)
  const qs = params.toString()
  return qs ? `/admin?${qs}` : '/admin'
}

function SortHeader({
  label,
  field,
  currentSort,
  currentDir,
  q,
}: {
  label: string
  field: AdminUserSortField
  currentSort: string
  currentDir: string
  q: string | null
}) {
  const active = currentSort === field
  const nextDir = active && currentDir === 'asc' ? 'desc' : 'asc'
  // First click on a new column: sensible default (created/status → desc, name/email → asc)
  const dir =
    active
      ? nextDir
      : field === 'created' || field === 'status'
        ? 'desc'
        : 'asc'

  return (
    <th className="px-3 py-2.5 font-semibold">
      <Link
        href={adminQuery({ q, sort: field, dir })}
        className={cn(
          'inline-flex items-center gap-1 hover:text-[var(--tt-ink,#111)]',
          active && 'text-[var(--tt-ink,#111)]',
        )}
      >
        {label}
        <span className="font-normal opacity-70" aria-hidden>
          {active ? (currentDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </Link>
    </th>
  )
}

export default async function AdminUsersPage({ searchParams }: AdminPageProps) {
  const admin = await requireAdmin()
  const params = searchParams ? await searchParams : {}
  const q = params.q?.trim() || null
  const cursor = params.cursor?.trim() || null
  const { sort, dir } = parseAdminUserSort(params.sort, params.dir)
  const { users, nextCursor } = await listAdminUsers({ q, cursor, sort, dir })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
          Search accounts, reset passwords, disable or delete users.
        </p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search name or email"
          className="h-9 min-w-[16rem] flex-1 rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
        />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q ? (
          <Button asChild variant="ghost">
            <Link href={adminQuery({ sort, dir })}>Clear</Link>
          </Button>
        ) : null}
      </form>

      <AdminUsersTable
        users={users}
        currentAdminId={admin.userId}
        sortHeaders={
          <>
            <SortHeader
              label="User"
              field="name"
              currentSort={sort}
              currentDir={dir}
              q={q}
            />
            <th className="px-3 py-2.5 font-semibold">Roles</th>
            <th className="px-3 py-2.5 font-semibold">Profiles</th>
            <SortHeader
              label="Status"
              field="status"
              currentSort={sort}
              currentDir={dir}
              q={q}
            />
            <SortHeader
              label="Created"
              field="created"
              currentSort={sort}
              currentDir={dir}
              q={q}
            />
            <th className="px-3 py-2.5 font-semibold">Actions</th>
          </>
        }
      />

      {nextCursor ? (
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link
              href={adminQuery({
                q,
                sort,
                dir,
                cursor: nextCursor,
              })}
            >
              Load more
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
