/**
 * Dark hero atmosphere matching `.tt-app-sidebar` — used when events/races
 * have no custom cover image.
 */
export const SIDEBAR_HERO_STYLE = {
  backgroundImage: [
    'radial-gradient(circle at 15% 95%, rgb(235 75 70 / 0.28) 0%, rgb(110 75 170 / 0.14) 35%, transparent 68%)',
    'radial-gradient(ellipse 80% 45% at 0% 100%, rgb(110 75 170 / 0.16) 0%, transparent 55%)',
  ].join(', '),
  backgroundColor: '#151827',
} as const
