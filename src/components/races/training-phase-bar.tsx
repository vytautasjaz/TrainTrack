import { cn } from '@/lib/utils'
import type { TrainingPhase } from '@/lib/season-races'

const PHASE_TONE: Record<TrainingPhase['id'], string> = {
  base: 'bg-muted-foreground/20',
  build: 'bg-muted-foreground/30',
  specific: 'bg-foreground/25',
  taper: 'bg-muted-foreground/15',
  transition: 'bg-muted-foreground/10',
}

type TrainingPhaseBarProps = {
  phases: TrainingPhase[]
  className?: string
}

export function TrainingPhaseBar({ phases, className }: TrainingPhaseBarProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        {phases.map((phase) => (
          <div
            key={phase.id}
            title={phase.label}
            className={cn('absolute inset-y-0 rounded-full', PHASE_TONE[phase.id])}
            style={{
              left: `${phase.start * 100}%`,
              width: `${(phase.end - phase.start) * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="relative h-4 w-full text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {phases.map((phase) => (
          <span
            key={phase.id}
            className="absolute truncate"
            style={{
              left: `${phase.start * 100}%`,
              width: `${(phase.end - phase.start) * 100}%`,
            }}
          >
            {phase.label}
          </span>
        ))}
      </div>
    </div>
  )
}
