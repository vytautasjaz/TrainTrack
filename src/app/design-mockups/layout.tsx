import type { ReactNode } from 'react'
import { Bebas_Neue, Inter } from 'next/font/google'
import './mockup-tokens.css'
import './mock-gradient-sidebar.css'

export const metadata = {
  title: 'TrainTrack Design Mockups',
  robots: { index: false, follow: false },
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--tt-font-inter',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  variable: '--tt-font-bebas',
  weight: '400',
  display: 'swap',
})

export default function DesignMockupsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.variable} ${bebasNeue.variable}`}>{children}</div>
  )
}
