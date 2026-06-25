import type { CSSProperties } from 'react'
import type { WorkoutType } from '../../types/workout'

type WorkoutTypeIconProps = {
  type: WorkoutType
  className?: string
  style?: CSSProperties
}

export function WorkoutTypeIcon({ type, className = 'h-6 w-6', style }: WorkoutTypeIconProps) {
  const props = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
    'aria-hidden': true,
  }

  switch (type) {
    case 'running':
      return (
        <svg {...props}>
          <circle cx="14" cy="5" r="2" />
          <path d="M11 11l-2 5 3 1 2-4 3 2 2 6" />
          <path d="M6 22l2-6" />
        </svg>
      )
    case 'cycling':
      return (
        <svg {...props}>
          <circle cx="6" cy="17" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M9 17h3l2-5 3 1 1 4" />
          <path d="M12 7l2 5" />
        </svg>
      )
    case 'swimming':
      return (
        <svg {...props}>
          <path d="M2 16c2-1 3-1 5 0s3 1 5 0 3-1 5 0" />
          <path d="M2 20c2-1 3-1 5 0s3 1 5 0 3-1 5 0" />
          <circle cx="10" cy="6" r="2" />
          <path d="M10 8v3l3 2" />
        </svg>
      )
    case 'brick':
      return (
        <svg {...props}>
          <circle cx="7" cy="7" r="2" />
          <path d="M5 20l2-8 3 2" />
          <circle cx="17" cy="10" r="2" />
          <path d="M15 20l2-6 3 1" />
          <path d="M3 12h6M15 12h6" strokeDasharray="2 2" />
        </svg>
      )
    case 'gym':
      return (
        <svg {...props}>
          <path d="M6 9v6M18 9v6" />
          <path d="M4 11h4M16 11h4" />
          <path d="M8 12h8" strokeWidth={2.5} />
        </svg>
      )
    case 'hyrox':
      return (
        <svg {...props}>
          <path d="M8 4v16M16 4v16" />
          <path d="M5 8h6M13 8h6M5 16h6M13 16h6" />
        </svg>
      )
  }
}
