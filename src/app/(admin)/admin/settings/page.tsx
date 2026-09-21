import { requireAdmin } from '@/lib/session'
import { getAppSettings } from '@/lib/app-settings'
import { AdminActivityFeedSettingsForm } from '@/components/admin/admin-activity-feed-settings-form'

export default async function AdminSettingsPage() {
  await requireAdmin()
  const settings = await getAppSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[var(--tt-ink,#111)]">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
          Site-wide feature flags. Changes apply to all coaches and athletes.
        </p>
      </div>

      <AdminActivityFeedSettingsForm
        coachActivityFeedEnabled={settings.coachActivityFeedEnabled}
        athleteActivityFeedEnabled={settings.athleteActivityFeedEnabled}
      />
    </div>
  )
}
