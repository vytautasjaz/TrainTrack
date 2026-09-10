'use client'

import { useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCroppedAvatarFile } from '@/lib/avatar-crop'

type AvatarCropDialogProps = {
  file: File | null
  open: boolean
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (file: File) => void
}

export function AvatarCropDialog({
  file,
  open,
  pending = false,
  onOpenChange,
  onConfirm,
}: AvatarCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setImageSrc(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setError(null)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!open) setBusy(false)
  }, [open])

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) return
    setBusy(true)
    setError(null)
    try {
      const cropped = await getCroppedAvatarFile(imageSrc, croppedAreaPixels)
      onConfirm(cropped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not crop photo.')
      setBusy(false)
    }
  }

  const saving = pending || busy

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[110] max-w-md gap-4 p-5 sm:p-6"
        overlayClassName="z-[110]"
      >
        <DialogHeader className="mb-0 space-y-1.5 pr-6">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Adjust photo
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Drag to move and zoom so the circle matches what others will see.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[min(68vw,20rem)] w-full overflow-hidden rounded-lg bg-[var(--tt-ink,#111)]">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, area) => setCroppedAreaPixels(area)}
            />
          ) : null}
        </div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Zoom
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            disabled={saving}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--tt-line,#ebebeb)] accent-[var(--tt-ink,#111)]"
          />
        </label>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || !croppedAreaPixels}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save photo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
