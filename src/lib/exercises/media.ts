import type { Prisma } from '@prisma/client'
import {
  exerciseMediaSchema,
  type ExerciseMedia,
  type ExerciseMediaItem,
} from '@/lib/exercises/types'

export function parseExerciseMedia(raw: unknown): ExerciseMedia | null {
  if (raw == null) return null
  const parsed = exerciseMediaSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function exerciseMediaToPrisma(
  media: ExerciseMedia | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (media == null || !media.items.length) return undefined
  return media as Prisma.InputJsonValue
}

export type ExercisePoseKind = 'start' | 'peak' | 'main' | 'other'

/** Infer pose from RepDB-style filenames (`…-start.webp`, `…-peak.webp`). */
export function exercisePoseKind(item: ExerciseMediaItem): ExercisePoseKind {
  const u = `${item.url} ${item.thumbnailUrl ?? ''}`
  if (/-start\./i.test(u)) return 'start'
  if (/-peak\./i.test(u)) return 'peak'
  if (/-main\./i.test(u)) return 'main'
  return 'other'
}

/** Start → peak (or main) for movement preview. */
export function exercisePoseSequence(
  media: ExerciseMedia | null | undefined,
): ExerciseMediaItem[] {
  if (!media?.items.length) return []
  const images = media.items.filter(
    (i) => i.type === 'IMAGE' || i.type === 'GIF' || i.type === 'VIDEO',
  )
  if (images.length <= 1) return images

  const start = images.find((i) => exercisePoseKind(i) === 'start')
  const peak = images.find((i) => exercisePoseKind(i) === 'peak')
  const main = images.find((i) => exercisePoseKind(i) === 'main')
  if (start && peak) return [start, peak]
  if (start && main) return [start, main]
  if (peak && main) return [main, peak]
  return images.slice(0, 2)
}

/** Prefer GIF, then peak pose (best list thumb), then first image. */
export function primaryExerciseMedia(
  media: ExerciseMedia | null | undefined,
): ExerciseMediaItem | null {
  if (!media?.items.length) return null
  const gif = media.items.find((i) => i.type === 'GIF')
  if (gif) return gif
  const peak = media.items.find(
    (i) =>
      (i.type === 'IMAGE' || i.type === 'VIDEO') &&
      exercisePoseKind(i) === 'peak',
  )
  if (peak) return peak
  const image = media.items.find((i) => i.type === 'IMAGE' || i.type === 'VIDEO')
  return image ?? media.items[0] ?? null
}

export function exerciseThumbnailUrl(
  media: ExerciseMedia | null | undefined,
): string | null {
  const primary = primaryExerciseMedia(media)
  if (!primary) return null
  return primary.thumbnailUrl ?? primary.url
}
