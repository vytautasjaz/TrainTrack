import type { EnduranceDetails } from '../../types/workout'

type EnduranceFieldsProps = {
  label?: string
  value: EnduranceDetails
  onChange: (value: EnduranceDetails) => void
}

export function EnduranceFields({ label, value, onChange }: EnduranceFieldsProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      {label && <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Distance (km)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={value.distanceKm ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                distanceKm: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="e.g. 10"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Duration (min)</span>
          <input
            type="number"
            min="0"
            value={value.durationMin ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                durationMin: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="e.g. 45"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
      </div>
    </div>
  )
}
