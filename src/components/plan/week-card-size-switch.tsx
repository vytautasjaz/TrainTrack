'use client'

import { ToolbarTextToggle } from '@/components/training/plan-sport-filter-bar'
import {
  WEEK_CARD_SIZE_HINT,
  WEEK_CARD_SIZES,
  type WeekCardSize,
} from '@/lib/week-card-size'

/** Quiet S/M/L — same text toggles as Notes / Color, not segmented pills. */
export function WeekCardSizeSwitch({
  value,
  onChange,
}: {
  value: WeekCardSize
  onChange: (size: WeekCardSize) => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Card size">
      {WEEK_CARD_SIZES.map((id) => (
        <ToolbarTextToggle
          key={id}
          pressed={value === id}
          onClick={() => onChange(id)}
          title={WEEK_CARD_SIZE_HINT[id]}
        >
          {id.toUpperCase()}
        </ToolbarTextToggle>
      ))}
    </div>
  )
}
