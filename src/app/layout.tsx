import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Manrope } from 'next/font/google'
import { PwaProvider } from '@/components/pwa/pwa-provider-lazy'
import { ThemeProvider } from '@/components/theme-provider'
import { NavigationProgress } from '@/components/ui/navigation-progress'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-ui',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  variable: '--font-display-family',
  weight: ['400', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

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
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${barlowCondensed.variable} pwa-safe`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <NavigationProgress />
          {children}
          <PwaProvider />
        </ThemeProvider>
      </body>
    </html>
  )
}
