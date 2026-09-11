/** Resolve hero photo: pending crop preview → saved custom cover. No photo → sidebar atmosphere. */
export function resolveRaceHeroImageUrl(args: {
  coverImageUrl?: string | null
  pendingPreviewUrl?: string | null
}): string | null {
  if (args.pendingPreviewUrl) return args.pendingPreviewUrl
  if (args.coverImageUrl?.trim()) return args.coverImageUrl.trim()
  return null
}
