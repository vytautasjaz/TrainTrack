'use client'

import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import type { CalculatorDirection } from '@/lib/calculators/storage'

type CalculatorDirectionToggleProps = {
  value: CalculatorDirection
  onChange: (value: CalculatorDirection) => void
}

const OPTIONS: { id: CalculatorDirection; label: string }[] = [
  { id: 'pace-to-time', label: 'Pace → Time' },
  { id: 'time-to-pace', label: 'Time → Pace' },
]

export function CalculatorDirectionToggle({ value, onChange }: CalculatorDirectionToggleProps) {
  return (
    <SegmentedControl aria-label="Calculator direction">
      {OPTIONS.map(({ id, label }) => (
        <SegmentedControlItem
          key={id}
          active={value === id}
          onClick={() => onChange(id)}
        >
          {label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}
