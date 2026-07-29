'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type ItemActionsProps = {
  editHref?: string
  editLabel?: string
  deleteAction?: (formData: FormData) => Promise<void>
  deleteId: string
  deleteIdField?: string
  deleteConfirmMessage: string
  deleteConfirmTitle?: string
  deleteLabel?: string
  redirectTo?: string
  children?: React.ReactNode
}

export function ItemActions({
  editHref,
  editLabel = 'Edit',
  deleteAction,
  deleteId,
  deleteIdField = 'id',
  deleteConfirmMessage,
  deleteConfirmTitle = 'Remove this item?',
  deleteLabel = 'Remove',
  redirectTo,
  children,
}: ItemActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    if (!deleteAction) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set(deleteIdField, deleteId)
      if (redirectTo) formData.set('redirectTo', redirectTo)
      await deleteAction(formData)
      setConfirmOpen(false)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {editHref && (
        <Button variant="ghost" size="xs" asChild>
          <Link href={editHref}>
            <Pencil className="h-3 w-3" />
            {editLabel}
          </Link>
        </Button>
      )}
      {children}
      {deleteAction && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground hover:text-foreground"
            aria-label={deleteLabel}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">{deleteLabel}</span>
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={deleteConfirmTitle}
            description={deleteConfirmMessage}
            confirmLabel={deleteLabel}
            pending={pending}
            onConfirm={handleConfirm}
          />
        </>
      )}
    </div>
  )
}
