/** TrainTrack visual tokens — aligned with web `--tt-*` / sport colors. */
export const colors = {
  bg: '#ffffff',
  sidebar: '#f5f5f5',
  surface: '#ffffff',
  ink: '#111111',
  inkSoft: '#6b6b6b',
  inkFaint: '#9a9a9a',
  line: '#ebebeb',
  lineStrong: '#dddddd',
  red: '#da2f36',
  good: '#1a9f5c',
  goodSoft: 'rgba(26, 159, 92, 0.12)',
  completedBg: '#f0faf4',
  completedBorder: '#86d39a',
  heroBg: '#151827',
  run: '#f4511e',
  swim: '#1e9bde',
  bike: '#16b8a6',
  strength: '#8b5cf6',
  recovery: '#8b5cf6',
  hyrox: '#d97706',
  shadow: '0px 1px 2px rgba(0,0,0,0.03), 0px 2px 8px rgba(0,0,0,0.03)',
} as const

export const fonts = {
  display: 'BebasNeue_400Regular',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemiBold: 'Inter_600SemiBold',
} as const

export type SportId = 'run' | 'bike' | 'swim' | 'strength' | 'recovery' | 'hyrox'

export function sportColor(sport: SportId): string {
  switch (sport) {
    case 'bike':
      return colors.bike
    case 'swim':
      return colors.swim
    case 'strength':
      return colors.strength
    case 'recovery':
      return colors.recovery
    case 'hyrox':
      return colors.hyrox
    default:
      return colors.run
  }
}
