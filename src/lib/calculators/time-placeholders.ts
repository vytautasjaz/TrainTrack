import type { IntervalPresetId } from '@/lib/calculators/interval-distances'
import type { RunningPresetId } from '@/lib/calculators/race-distances'

export function runningFinishTimePlaceholder(
  preset: RunningPresetId | 'custom',
): string {
  switch (preset) {
    case '5k':
      return '22:30'
    case '10k':
      return '45:00'
    case 'half':
      return '1:45:00'
    case 'marathon':
      return '3:30:00'
    case 'custom':
      return '1:15:00'
    default:
      return '45:30'
  }
}

export function intervalFinishTimePlaceholder(
  preset: IntervalPresetId | 'custom',
): string {
  switch (preset) {
    case '100':
      return '0:20,0'
    case '200':
      return '0:40'
    case '400':
      return '1:30'
    case '800':
      return '3:00'
    case '1000':
      return '4:00'
    case '1500':
      return '6:00'
    case '2000':
      return '8:00'
    case '3000':
      return '12:00'
    case '5000':
      return '20:00'
    case 'custom':
      return '5:00'
    default:
      return '4:00'
  }
}
