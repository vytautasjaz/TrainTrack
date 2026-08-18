'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  registerWebPushSubscription,
  unregisterWebPushSubscription,
} from '@/app/actions/push-notifications'

type InboxNotificationsToggleProps = {
  pushConfigured: boolean
}

function base64UrlToUint8Array(base64UrlString: string) {
  const padding = '='.repeat((4 - (base64UrlString.length % 4)) % 4)
  const base64 = (base64UrlString + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) output[i] = rawData.charCodeAt(i)
  return output
}

export function InboxNotificationsToggle({ pushConfigured }: InboxNotificationsToggleProps) {
  const [isPending, startTransition] = useTransition()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [hasSubscription, setHasSubscription] = useState(false)
  const canUsePush = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (!canUsePush) return
    setPermission(Notification.permission)
    void (async () => {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      setHasSubscription(Boolean(sub))
    })()
  }, [canUsePush])

  const disabledReason = useMemo(() => {
    if (!pushConfigured) return 'Push not configured on server'
    if (!canUsePush) return 'Push not supported on this browser/device'
    if (!publicKey) return 'Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY'
    return null
  }, [pushConfigured, canUsePush, publicKey])

  async function enableNotifications() {
    if (!publicKey) return
    const requested = await Notification.requestPermission()
    setPermission(requested)
    if (requested !== 'granted') return

    const reg = await navigator.serviceWorker.register('/sw.js')
    const existing = await reg.pushManager.getSubscription()
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey),
      }))

    const json = sub.toJSON()
    const p256dh = json.keys?.p256dh
    const auth = json.keys?.auth
    if (!sub.endpoint || !p256dh || !auth) throw new Error('Failed to read push subscription keys')

    await registerWebPushSubscription({
      endpoint: sub.endpoint,
      p256dh,
      auth,
    })
    setHasSubscription(true)
  }

  async function disableNotifications() {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) {
      setHasSubscription(false)
      return
    }
    await unregisterWebPushSubscription(sub.endpoint)
    await sub.unsubscribe()
    setHasSubscription(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={Boolean(disabledReason) || isPending}
        title={disabledReason ?? undefined}
        onClick={() =>
          startTransition(async () => {
            if (hasSubscription) await disableNotifications()
            else await enableNotifications()
          })
        }
      >
        {hasSubscription ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        {isPending
          ? hasSubscription
            ? 'Disabling…'
            : 'Enabling…'
          : hasSubscription
            ? 'Inbox notifications on'
            : 'Enable inbox notifications'}
      </Button>
      {permission === 'denied' ? (
        <span className="text-[11px] text-muted-foreground">
          Browser notifications blocked — enable in browser settings.
        </span>
      ) : null}
    </div>
  )
}
