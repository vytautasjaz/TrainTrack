'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getExerciseDetail,
  type ExerciseDetailDto,
} from '@/app/actions/exercises'
import { ExercisePosePair } from '@/components/exercises/exercise-pose-sequence'
import { ExerciseThumbnail } from '@/components/exercises/exercise-thumbnail'
import {
  formatExerciseLabel,
  formatExerciseMetaLine,
} from '@/components/exercises/format-exercise-meta'

type ExerciseDetailsProps = {
  exerciseId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When selecting a variation inside the panel. */
  onSelectExercise?: (id: string) => void
}

function MetaBox({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="rounded-[8px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-[var(--tt-v2-light,#F5F6F7)]/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9ca3af)]">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-medium text-[var(--tt-ink,#111315)]">
        {value}
      </p>
    </div>
  )
}

function InstructionList({ text }: { text: string }) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean)
  if (lines.length <= 1) {
    return (
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--tt-ink,#111315)]">
        {text}
      </p>
    )
  }
  return (
    <ol className="list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-[var(--tt-ink,#111315)]">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ol>
  )
}

export function ExerciseDetails({
  exerciseId,
  open,
  onOpenChange,
  onSelectExercise,
}: ExerciseDetailsProps) {
  const [detail, setDetail] = useState<ExerciseDetailDto | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !exerciseId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void getExerciseDetail(exerciseId)
      .then((next) => {
        if (!cancelled) setDetail(next)
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, exerciseId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="z-[320] flex max-h-[min(92vh,44rem)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        overlayClassName="z-[310] bg-black/50"
      >
        <DialogTitle className="sr-only">
          {detail?.canonicalName ?? 'Exercise details'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Full exercise instructions and media
        </DialogDescription>

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--tt-v2-light-panel-line,#E3E6E9)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-bold text-[var(--tt-ink,#111315)]">
              {loading && !detail
                ? 'Loading…'
                : (detail?.canonicalName ?? 'Exercise')}
            </h2>
            {detail ? (
              <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b7280)]">
                {formatExerciseMetaLine([
                  detail.movementPattern,
                  detail.equipment[0],
                ])}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-[var(--tt-ink-faint,#9ca3af)] transition hover:bg-[var(--tt-v2-light,#F5F6F7)] hover:text-[var(--tt-ink,#111315)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {loading && !detail ? (
            <div className="space-y-3">
              <div className="mx-auto h-40 w-40 animate-pulse rounded-[8px] bg-[var(--tt-v2-light,#F5F6F7)]" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--tt-v2-light,#F5F6F7)]" />
            </div>
          ) : detail ? (
            <div className="space-y-5">
              <ExercisePosePair
                media={detail.media ?? null}
                alt={detail.canonicalName}
              />

              <div className="grid grid-cols-2 gap-2">
                <MetaBox
                  label="Movement pattern"
                  value={formatExerciseLabel(detail.movementPattern)}
                />
                <MetaBox
                  label="Equipment"
                  value={formatExerciseLabel(detail.equipment[0])}
                />
              </div>

              {(detail.primaryMuscles.length > 0 ||
                detail.secondaryMuscles.length > 0) && (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9ca3af)]">
                    Target muscles
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {detail.primaryMuscles.map((m) => (
                      <span
                        key={`p-${m}`}
                        className="rounded-[4px] bg-[var(--tt-ink,#111315)] px-2 py-0.5 text-[11px] font-medium text-white"
                      >
                        {formatExerciseLabel(m)}
                      </span>
                    ))}
                    {detail.secondaryMuscles.map((m) => (
                      <span
                        key={`s-${m}`}
                        className="rounded-[4px] bg-[var(--tt-v2-light,#F5F6F7)] px-2 py-0.5 text-[11px] font-medium text-[var(--tt-ink-soft,#6b7280)]"
                      >
                        {formatExerciseLabel(m)}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {detail.instructions?.trim() ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9ca3af)]">
                    Instructions
                  </h3>
                  <div className="mt-2">
                    <InstructionList text={detail.instructions.trim()} />
                  </div>
                </section>
              ) : null}

              {detail.coachingCues.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9ca3af)]">
                    Coaching cues
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {detail.coachingCues.map((cue) => (
                      <li
                        key={cue}
                        className="flex items-start gap-1.5 text-[13px] leading-snug text-[var(--tt-ink,#111315)]"
                      >
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tt-good,#16a34a)]"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">{cue}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {detail.commonMistakes.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9ca3af)]">
                    Common mistakes
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {detail.commonMistakes.map((m) => (
                      <li
                        key={m}
                        className="flex items-start gap-1.5 text-[13px] leading-snug text-[var(--tt-ink,#111315)]"
                      >
                        <X
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tt-red,#da2f36)]"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">{m}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {detail.variations.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9ca3af)]">
                    Variations
                  </h3>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {detail.variations.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => onSelectExercise?.(v.id)}
                        className="flex w-[7.5rem] shrink-0 flex-col gap-1.5 rounded-[8px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white p-2 text-left transition hover:border-[var(--tt-ink,#111)]/25"
                      >
                        <ExerciseThumbnail
                          src={v.thumbnailUrl}
                          alt={v.canonicalName}
                          size="md"
                          className="w-full !h-16 !w-full"
                        />
                        <span className="line-clamp-2 text-[11px] font-medium leading-snug text-[var(--tt-ink,#111315)]">
                          {v.canonicalName}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {detail.licenseAttribution ? (
                <p className="border-t border-[var(--tt-v2-light-panel-line,#E3E6E9)] pt-3 text-[10px] leading-snug text-[var(--tt-ink-faint,#9ca3af)]">
                  Media:{' '}
                  {/repdb/i.test(detail.licenseAttribution) ? (
                    <a
                      href="https://repdb.co"
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-[var(--tt-ink-faint,#9ca3af)]/50 underline-offset-2 hover:text-[var(--tt-ink-soft,#6b7280)]"
                    >
                      {detail.licenseAttribution}
                    </a>
                  ) : (
                    detail.licenseAttribution
                  )}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--tt-ink-soft,#6b7280)]">
              Exercise not found.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
