import { cn } from '@/lib/utils'

type ProgressRingProps = {
  value: number
  max?: number
  size?: number
  stroke?: number
  label?: React.ReactNode
  sublabel?: React.ReactNode
  className?: string
}

export function ProgressRing({
  value,
  max = 100,
  size = 168,
  stroke = 10,
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-brand transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label}
        {sublabel}
      </div>
    </div>
  )
}
