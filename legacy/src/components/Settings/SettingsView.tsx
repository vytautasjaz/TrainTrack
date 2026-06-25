import { useState, type ReactNode } from 'react'
import { dayIntentRepository } from '../../db/dayIntentRepository'
import { workoutRepository } from '../../db/workoutRepository'
import { useRole } from '../../context/RoleContext'
import { USER_ROLES } from '../../types/role'

type SettingsViewProps = {
  onDataCleared: () => void
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-xs font-medium text-gray-500">{title}</h2>
      <div className="divide-y divide-gray-100 border-y border-gray-100">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({
  label,
  description,
  onClick,
  danger = false,
}: {
  label: string
  description?: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-3 px-0 py-4 text-left hover:opacity-70"
    >
      <span>
        <span className={`block text-sm font-semibold ${danger ? 'text-red-600' : 'text-gray-900'}`}>
          {label}
        </span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <span className="text-muted">›</span>
    </button>
  )
}

export function SettingsView({ onDataCleared }: SettingsViewProps) {
  const { role, setRole } = useRole()
  const [message, setMessage] = useState<string | null>(null)

  const handleExport = async () => {
    const [workouts, dayIntents] = await Promise.all([
      workoutRepository.getAll(),
      dayIntentRepository.getAll(),
    ])
    const blob = new Blob(
      [JSON.stringify({ workouts, dayIntents, role }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `traintrack-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`Exported ${workouts.length} workout${workouts.length === 1 ? '' : 's'}.`)
  }

  const handleClearData = async () => {
    const confirmed = window.confirm(
      'Delete all workouts and day plans? This permanently removes your local data and cannot be undone.',
    )
    if (!confirmed) return

    await Promise.all([workoutRepository.clearAll(), dayIntentRepository.clearAll()])
    onDataCleared()
    setMessage('All local data has been deleted.')
  }

  return (
    <div>
      <SettingsSection title="Role">
        <div className="py-4">
          <p className="mb-3 text-sm text-gray-600">
            Switch role to see the app from a coach or trainee perspective. On a shared device,
            pick the role that matches who is using the app right now.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {USER_ROLES.map((option) => {
              const selected = role === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRole(option.value)
                    setMessage(`Switched to ${option.label}.`)
                  }}
                  className={`rounded-lg border px-3 py-3 text-left ${
                    selected ? 'border-brand' : 'border-gray-200'
                  }`}
                >
                  <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsRow
          label="Export workouts"
          description="Download all workouts as a JSON file"
          onClick={() => void handleExport()}
        />
        <SettingsRow
          label="Clear all data"
          description="Remove every workout and day plan from this device"
          onClick={() => void handleClearData()}
          danger
        />
      </SettingsSection>

      <SettingsSection title="App">
        <SettingsRow
          label="Install on iPhone"
          description="Safari → Share → Add to Home Screen"
          onClick={() =>
            setMessage('Open TrainTrack in Safari, tap Share, then Add to Home Screen.')
          }
        />
        <div className="py-4">
          <p className="text-sm font-semibold text-gray-900">TrainTrack</p>
          <p className="mt-0.5 text-xs text-muted">Coach & trainee workout planner · v1.1</p>
        </div>
      </SettingsSection>

      {message && (
        <p className="border border-gray-200 px-4 py-3 text-sm text-gray-700">{message}</p>
      )}
    </div>
  )
}
