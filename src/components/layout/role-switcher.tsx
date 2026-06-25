import { prisma } from '@/lib/prisma'
import type { SessionContext } from '@/lib/session'
import { getCoachAthletes } from '@/lib/session'
import { switchAthlete, switchUser } from '@/app/actions/session'
import { Badge } from '@/components/ui/badge'

export async function RoleSwitcher({ session }: { session: SessionContext }) {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })
  const athletes =
    session.role === 'COACH' ? await getCoachAthletes(session.userId) : []

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <Badge className="bg-brand-soft text-brand">{session.role.toLowerCase()}</Badge>
      <form action={switchUser} className="flex items-center gap-1.5">
        <select
          name="userId"
          defaultValue={session.userId}
          className="input-field max-w-[160px] py-1.5 text-xs"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
          Switch
        </button>
      </form>
      {session.role === 'COACH' && athletes.length > 0 && (
        <form action={switchAthlete} className="flex items-center gap-1.5">
          <select
            name="athleteId"
            defaultValue={session.athleteId ?? athletes[0]?.id}
            className="input-field max-w-[140px] py-1.5 text-xs"
          >
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            View
          </button>
        </form>
      )}
    </div>
  )
}
