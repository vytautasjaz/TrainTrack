import { useState, type FormEvent } from 'react'
import {
  DAY_INTENT_OPTIONS,
  type DayIntent,
  type UpsertDayIntentInput,
} from '../../types/dayIntent'

type DayIntentFormProps = {
  defaultDate: string
  intent?: DayIntent
  onClose: () => void
  onSave: (input: UpsertDayIntentInput) => Promise<void>
  onDelete?: () => Promise<void>
}

function DayIntentForm({ defaultDate, intent, onClose, onSave, onDelete }: DayIntentFormProps) {
  const [date, setDate] = useState(intent?.date ?? defaultDate)
  const [status, setStatus] = useState(intent?.status ?? DAY_INTENT_OPTIONS[0].value)
  const [notes, setNotes] = useState(intent?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!date) {
      setError('Please choose a date.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        date,
        status,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch {
      setError('Could not save plan. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    const confirmed = window.confirm('Remove your plan for this day?')
    if (!confirmed) return

    setSaving(true)
    try {
      await onDelete()
      onClose()
    } catch {
      setError('Could not remove plan. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand">
            {intent ? 'Update day plan' : 'Plan ahead'}
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            Let your coach know your availability or plans for a future day.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Date *</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-brand focus:ring-2"
        />
      </label>

      <fieldset className="mb-4">
        <legend className="mb-2 block text-sm font-medium text-slate-700">Status</legend>
        <div className="space-y-2">
          {DAY_INTENT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`block rounded-lg border px-3 py-2.5 ${
                status === option.value ? 'border-brand' : 'border-gray-200'
              }`}
            >
              <span className="flex items-start gap-2">
                <input
                  type="radio"
                  name="day-intent-status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={() => setStatus(option.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Travel, race week, how you're feeling, own session ideas…"
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none ring-brand focus:ring-2"
        />
      </label>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        {intent && onDelete && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving}
            className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Remove
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
      </div>
    </form>
  )
}

type DayIntentModalProps = {
  defaultDate: string
  intent?: DayIntent
  open: boolean
  onClose: () => void
  onSave: (input: UpsertDayIntentInput) => Promise<void>
  onDelete?: () => Promise<void>
}

export function DayIntentModal({
  defaultDate,
  intent,
  open,
  onClose,
  onSave,
  onDelete,
}: DayIntentModalProps) {
  if (!open) return null

  const formKey = intent ? intent.id : `new-${defaultDate}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white">
        <DayIntentForm
          key={formKey}
          defaultDate={defaultDate}
          intent={intent}
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
