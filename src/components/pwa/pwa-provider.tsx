'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Share, X } from 'lucide-react'
import { TrainTrackAppIcon } from '@/components/brand/traintrack-logo'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'traintrack-install-dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PwaClientState = {
  standalone: boolean
  dismissed: boolean
  ios: boolean
}

const serverPwaState: PwaClientState = {
  standalone: false,
  dismissed: false,
  ios: false,
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isLocalDevHost() {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

async function unregisterLocalServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
}

let cachedSnapshot = serverPwaState

function readPwaState(): PwaClientState {
  const standalone = isStandalone()
  const dismissed = localStorage.getItem(DISMISS_KEY) === '1'
  const ios = isIos()

  if (
    cachedSnapshot.standalone === standalone &&
    cachedSnapshot.dismissed === dismissed &&
    cachedSnapshot.ios === ios
  ) {
    return cachedSnapshot
  }

  cachedSnapshot = { standalone, dismissed, ios }
  return cachedSnapshot
}

function subscribePwa(onStoreChange: () => void) {
  window.addEventListener('beforeinstallprompt', onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener('beforeinstallprompt', onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function PwaProvider() {
  const clientPwa = useSyncExternalStore(subscribePwa, readPwaState, () => serverPwaState)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development' || isLocalDevHost()) {
        void unregisterLocalServiceWorkers()
      } else {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      }
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    cachedSnapshot = { ...cachedSnapshot, dismissed: true }
    setDismissed(true)
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
    setDismissed(true)
  }

  const showBanner =
    !dismissed &&
    !clientPwa.standalone &&
    !clientPwa.dismissed &&
    (clientPwa.ios || Boolean(installEvent))

  if (!showBanner) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-[60] portrait:max-lg:block landscape:max-lg:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
      <div className="flex items-start gap-3 rounded-[6px] border border-border bg-card p-3 shadow-none">
        <TrainTrackAppIcon className="h-10 w-10 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install TrainTrack</p>
          {clientPwa.ios ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap <Share className="mx-0.5 inline h-3 w-3" /> Share, then{' '}
              <span className="font-medium text-foreground">Add to Home Screen</span> to open it like an app.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add TrainTrack to your home screen for full-screen, app-like access.
            </p>
          )}
          <div className="mt-2 flex gap-2">
            {!clientPwa.ios && installEvent ? (
              <Button type="button" size="sm" variant="secondary" className="h-8 rounded-[6px]" onClick={install}>
                Install
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" className="h-8 rounded-[6px]" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
