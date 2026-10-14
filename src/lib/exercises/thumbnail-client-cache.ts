/**
 * Session-scoped client cache for exercise thumbnail URLs.
 * Avoids a second server round-trip when reopening the same workout modal.
 */

const urlById = new Map<string, string | null>()
const warmedUrls = new Set<string>()

export function readThumbnailCache(ids: string[]): {
  known: Record<string, string | null>
  missing: string[]
} {
  const known: Record<string, string | null> = {}
  const missing: string[] = []
  for (const id of ids) {
    if (urlById.has(id)) known[id] = urlById.get(id) ?? null
    else missing.push(id)
  }
  return { known, missing }
}

export function writeThumbnailCache(map: Record<string, string | null>) {
  for (const [id, url] of Object.entries(map)) {
    urlById.set(id, url)
  }
}

/** Decode images into the browser cache before (or as) <img> mounts. */
export function warmThumbnailUrls(
  urls: Array<string | null | undefined>,
) {
  if (typeof window === 'undefined') return
  for (const url of urls) {
    if (!url || warmedUrls.has(url)) continue
    warmedUrls.add(url)
    const img = new Image()
    img.decoding = 'async'
    img.referrerPolicy = 'no-referrer'
    img.src = url
  }
}
