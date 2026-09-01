'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookmarkPlus } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FieldSelect } from '@/components/ui/field-select'
import { FormError } from '@/components/ui/form-error'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import type { WorkoutLibraryFolderPickerItem } from '@/app/actions/workout-builder'

type SaveToLibraryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sportType: WorkoutType
  defaultTitle: string
  folders: WorkoutLibraryFolderPickerItem[]
  pending?: boolean
  error?: string | null
  onConfirm: (input: { title: string; folderId: string | null }) => void
}

export function SaveToLibraryDialog({
  open,
  onOpenChange,
  sportType,
  defaultTitle,
  folders,
  pending = false,
  error = null,
  onConfirm,
}: SaveToLibraryDialogProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [folderId, setFolderId] = useState('unfiled')

  useEffect(() => {
    if (!open) return
    setTitle(defaultTitle)
    setFolderId('unfiled')
  }, [open, defaultTitle])

  const folderOptions = useMemo(() => {
    const sportFolders = folders
      .filter((f) => f.sport === sportType)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
    return [
      { value: 'unfiled', label: 'Unfiled' },
      ...sportFolders.map((f) => ({ value: f.id, label: f.name })),
    ]
  }, [folders, sportType])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[80] max-w-sm gap-5 p-5 sm:p-6"
        overlayClassName="z-[80]"
      >
        <DialogHeader className="mb-0 space-y-1.5 pr-6">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Save to library
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Keep this workout as a reusable template. Your plan day is unchanged
            until you press Save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <FormField label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Template title"
              className="h-9"
              autoFocus
            />
          </FormField>
          <FormField label="Folder">
            <FieldSelect
              value={folderId}
              onValueChange={setFolderId}
              options={folderOptions}
              aria-label="Library folder"
              className="h-9"
            />
          </FormField>
          {error ? <FormError message={error} /> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || !title.trim()}
            className="gap-1.5"
            onClick={() =>
              onConfirm({
                title: title.trim(),
                folderId: folderId === 'unfiled' ? null : folderId,
              })
            }
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            {pending ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
