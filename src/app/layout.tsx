import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Inter } from 'next/font/google'
import { PwaProvider } from '@/components/pwa/pwa-provider-lazy'
import { InboxPushBridge } from '@/components/inbox/inbox-push-bridge'
import { ThemeProvider } from '@/components/theme-provider'
import { NavigationProgress } from '@/components/ui/navigation-progress'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  variable: '--font-display-family',
  weight: '400',
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${bebasNeue.variable}`}
    >
      <body className="pwa-safe">
        {/* PWA splash — inline script adds tt-splash--done before hydrate; suppress mismatch */}
        <div id="tt-splash" aria-hidden="true" suppressHydrationWarning>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="72" height="72">
            <path d="M20 68L50 32L80 68" stroke="#111111" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M50 64L59 73L50 82L41 73L50 64Z" fill="#da2f36" />
          </svg>
          <span>TrainTrack</span>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function hide(){var el=document.getElementById('tt-splash');if(el)el.classList.add('tt-splash--done');}if(document.readyState==='complete'){hide();}else{window.addEventListener('load',hide);}})();`,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <NavigationProgress />
          {children}
          <InboxPushBridge />
          <PwaProvider />
        </ThemeProvider>
      </body>
    </html>
  )
}
