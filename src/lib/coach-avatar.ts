/** Coach-facing photo: uploaded CoachProfile.avatarUrl, then OAuth User.image. */

export function resolveCoachAvatarUrl(
  uploaded?: string | null,
  oauthImage?: string | null,
): string | null {
  const raw = uploaded?.trim() || oauthImage?.trim() || null
  if (!raw) return null
  return publicAvatarSrc(raw)
}

/** Point relative uploads at production so localhost matches Netlify. */
export function publicAvatarSrc(url: string): string {
  if (!url.startsWith('/uploads/avatars/')) return url
  const origin = process.env.NEXT_PUBLIC_AVATAR_ORIGIN?.replace(/\/$/, '')
  if (!origin) return url
  return `${origin}${url}`
}
