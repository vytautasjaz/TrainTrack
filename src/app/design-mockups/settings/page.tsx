'use client'

import { useState } from 'react'
import { MockAppChrome } from '../_components/mock-app-chrome'
import { SettingsMockContent } from '../_components/settings-mock-content'
import type { MockRole } from '../_components/mock-ui'

/**
 * Profile & Preferences — sticky left subnav (brief §7.16 A).
 * Athlete/Coach chrome toggle stays on this page and swaps sections.
 */
export default function SettingsMockPage() {
  const [role, setRole] = useState<MockRole>('athlete')

  return (
    <MockAppChrome
      title="Settings · Desktop"
      status="Draft"
      role={role}
      activeNav="Settings"
      switchHomesOnRole={false}
      onRoleChange={setRole}
    >
      <div className="w-full min-w-0 max-w-[90rem]">
        <SettingsMockContent role={role} />
      </div>
      <p className="mt-8 text-[11px] text-[var(--tt-ink-faint)]">
        Profile · zones · integrations · coach planning/builder ·{' '}
        <a href="/settings" className="text-[var(--tt-ink-soft)]">
          live /settings
        </a>
      </p>
    </MockAppChrome>
  )
}
