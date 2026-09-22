import { requireAdmin } from '@/lib/session'
import { listAdminUsers } from '@/lib/admin'
import {
  listRecentMemberships,
  listSubscriptionPlans,
} from '@/lib/admin-memberships'
import { AdminPlansManager } from '@/components/admin/admin-plans-manager'
import { AdminMembershipsAssign } from '@/components/admin/admin-memberships-assign'
import { listSkillSlugs } from '@/lib/ai/skills/registry'

export default async function AdminMembershipsPage() {
  await requireAdmin()
  const [plans, memberships, { users }, skillSlugs] = await Promise.all([
    listSubscriptionPlans(),
    listRecentMemberships(50),
    listAdminUsers({}),
    Promise.resolve(listSkillSlugs()),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--tt-ink,#111)]">
          Memberships
        </h1>
        <p className="mt-1 text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
          Manage subscription plans, AI limits, skill allowlists, and user
          memberships.
        </p>
      </div>

      <AdminPlansManager plans={plans} knownSkillSlugs={skillSlugs} />
      <AdminMembershipsAssign
        plans={plans}
        memberships={memberships}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }))}
      />
    </div>
  )
}
