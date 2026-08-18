import Link from 'next/link'
import { WifiOff } from 'lucide-react'

export const metadata = {
  title: 'Offline — TrainTrack',
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="max-w-sm text-muted-foreground">
          No internet connection. Pages you&apos;ve already visited are still available, but new content can&apos;t load right now.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-foreground/90"
      >
        Try again
      </Link>
    </div>
  )
}
