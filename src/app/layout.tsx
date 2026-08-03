import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { PwaProvider } from '@/components/pwa/pwa-provider-lazy'
import { ThemeProvider } from '@/components/theme-provider'
import { NavigationProgress } from '@/components/ui/navigation-progress'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'TrainTrack',
  description: 'Simple training planner for coaches and athletes',
  applicationName: 'TrainTrack',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TrainTrack',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192.svg',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#f4f6fb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} pwa-safe`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <NavigationProgress />
          {children}
          <PwaProvider />
        </ThemeProvider>
      </body>
    </html>
  )
}
