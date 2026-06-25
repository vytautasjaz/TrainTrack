import { prisma } from '@/lib/prisma'
import type { SessionContext } from '@/lib/session'
import { getCoachAthletes } from '@/lib/session'
import { switchAthlete, switchUser } from '@/app/actions/session'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type RoleSwitcherProps = {
  session: SessionContext
  layout?: 'sidebar' | 'inline'
}

export async function RoleSwitcher({ session, layout = 'inline' }: RoleSwitcherProps) {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })
  const athletes =
    session.role === 'COACH' ? await getCoachAthletes(session.userId) : []

  const isSidebar = layout === 'sidebar'

  return (
    <div
      className={cn(
        isSidebar
          ? 'space-y-3 border-t border-border/60 pt-4'
          : 'flex flex-wrap items-center justify-end gap-2 text-sm',
      )}
    >
      {isSidebar && (
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Demo account
        </p>
      )}

      <Badge className={cn('bg-brand-soft text-brand', isSidebar && 'w-fit')}>
        {session.role.toLowerCase()}
      </Badge>

      <form action={switchUser} className={cn(isSidebar ? 'space-y-2' : 'flex items-center gap-1.5')}>
        {isSidebar && (
          <label className="block px-1 text-xs text-muted-foreground">Switch user</label>
        )}
        <div className={cn(isSidebar ? 'space-y-2' : 'flex items-center gap-1.5')}>
          <select
            name="userId"
            defaultValue={session.userId}
            className={cn(
              'input-field py-1.5 text-xs',
              isSidebar ? 'w-full' : 'max-w-[160px]',
            )}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={cn(
              'rounded-full bg-muted text-xs font-medium',
              isSidebar ? 'w-full px-3 py-2' : 'px-2.5 py-1',
            )}
          >
            Switch
          </button>
        </div>
      </form>

      {session.role === 'COACH' && athletes.length > 0 && (
        <form action={switchAthlete} className={cn(isSidebar ? 'space-y-2' : 'flex items-center gap-1.5')}>
          {isSidebar && (
            <label className="block px-1 text-xs text-muted-foreground">View as athlete</label>
          )}
          <div className={cn(isSidebar ? 'space-y-2' : 'flex items-center gap-1.5')}>
            <select
              name="athleteId"
              defaultValue={session.athleteId ?? athletes[0]?.id}
              className={cn(
                'input-field py-1.5 text-xs',
                isSidebar ? 'w-full' : 'max-w-[140px]',
              )}
            >
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className={cn(
                'rounded-full bg-muted text-xs font-medium',
                isSidebar ? 'w-full px-3 py-2' : 'px-2.5 py-1',
              )}
            >
              View
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
