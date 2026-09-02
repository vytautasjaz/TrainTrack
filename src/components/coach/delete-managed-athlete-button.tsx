'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteManagedAthlete } from '@/app/actions/athletes'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'

type DeleteManagedAthleteButtonProps = {
  athleteId: string
  athleteName: string
  onDeleted?: () => void
}

export function DeleteManagedAthleteButton({
  athleteId,
  athleteName,
  onDeleted,
}: DeleteManagedAthleteButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    const formData = new FormData()
    formData.set('athleteId', athleteId)

    startTransition(async () => {
      try {
        await deleteManagedAthlete(formData)
        setOpen(false)
        onDeleted?.()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete athlete')
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tt-line)] pt-4">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[var(--tt-ink)]">Remove managed profile</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--tt-ink-faint)]">
            Deletes {athleteName}&apos;s plan and history. Only available before they link an app
            account.
          </p>
          {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          disabled={isPending}
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${athleteName}?`}
        description="This removes their training plan, workouts, races, and messages. This cannot be undone. You can only delete profiles that haven't been linked to an app account."
        confirmLabel={isPending ? 'Deleting…' : 'Delete profile'}
        pending={isPending}
        onConfirm={handleConfirm}
      />
    </>
  )
}
