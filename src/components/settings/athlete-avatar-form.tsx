'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormMessage } from '@/components/ui/form-field'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import {
  clearAthleteAvatar,
  syncAvatarFromStrava,
  uploadAthleteAvatar,
} from '@/app/actions/preferences'

type AthleteAvatarFormProps = {
  name: string
  avatarUrl?: string | null
  stravaConnected?: boolean
}

export function AthleteAvatarForm({
  name,
  avatarUrl,
  stravaConnected = false,
}: AthleteAvatarFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function run(action: () => Promise<void>, successMessage = true) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await action()
        if (successMessage) setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update photo.')
      }
    })
  }

  function handleClear() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await clearAthleteAvatar()
        setConfirmOpen(false)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update photo.')
        setConfirmOpen(false)
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.set('avatar', file)
    run(() => uploadAthleteAvatar(formData))
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <AthleteAvatar name={name} avatarUrl={avatarUrl} size="lg" />
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Shown next to your name for your coach. Upload a photo or pull it from Strava.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" />
              {isPending ? 'Saving…' : 'Upload photo'}
            </Button>
            {stravaConnected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => run(() => syncAvatarFromStrava())}
              >
                Use Strava photo
              </Button>
            ) : null}
            {avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                className="text-muted-foreground"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      {saved && !error && <FormMessage variant="success">Photo updated.</FormMessage>}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove photo?"
        description="Your profile photo will be cleared."
        confirmLabel="Remove"
        pending={isPending}
        onConfirm={handleClear}
      />
    </div>
  )
}
