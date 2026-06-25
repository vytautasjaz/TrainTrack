'use client'

import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ItemActionsProps = {
  editHref?: string
  editLabel?: string
  deleteAction?: (formData: FormData) => Promise<void>
  deleteId: string
  deleteIdField?: string
  deleteConfirmMessage: string
  deleteLabel?: string
  children?: React.ReactNode
}

export function ItemActions({
  editHref,
  editLabel = 'Edit',
  deleteAction,
  deleteId,
  deleteIdField = 'id',
  deleteConfirmMessage,
  deleteLabel = 'Remove',
  children,
}: ItemActionsProps) {
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
        <form action={deleteAction}>
          <input type="hidden" name={deleteIdField} value={deleteId} />
          <Button
            type="submit"
            variant="ghost"
            size="xs"
            className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              if (!window.confirm(deleteConfirmMessage)) {
                e.preventDefault()
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
            {deleteLabel}
          </Button>
        </form>
      )}
    </div>
  )
}
