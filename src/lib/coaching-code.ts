import { customAlphabet } from './coaching-code-alphabet'

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const gen = customAlphabet(alphabet, 5)

/** Public coach invite code, e.g. TT-83KF9 */
export function generateCoachingCode(): string {
  return `TT-${gen()}`
}

export function normalizeCoachingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}
