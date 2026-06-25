import type { DayIntent } from '../../types/dayIntent'
import { getDayIntentLabel } from '../../types/dayIntent'
import { DAY_INTENT_COLORS } from '../../utils/dayIntentDisplay'

type DayIntentBannerProps = {
  intent: DayIntent
  onEdit?: () => void
  readOnly?: boolean
}

export function DayIntentBanner({ intent, onEdit, readOnly = false }: DayIntentBannerProps) {
  const colors = DAY_INTENT_COLORS[intent.status]

  return (
    <div
      className="mb-4 border-l-2 py-2 pl-3"
      style={{ borderColor: colors.dot, backgroundColor: colors.bg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium" style={{ color: colors.text }}>
            {readOnly ? 'Trainee plan' : 'Your plan for this day'}
          </p>
          <p className="text-sm font-medium text-gray-900">{getDayIntentLabel(intent.status)}</p>
          {intent.notes && <p className="mt-1 text-sm text-gray-600">{intent.notes}</p>}
        </div>
        {!readOnly && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-xs font-medium text-brand hover:opacity-70"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
