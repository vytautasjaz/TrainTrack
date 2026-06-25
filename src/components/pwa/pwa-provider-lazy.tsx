'use client'

import dynamic from 'next/dynamic'

export const PwaProvider = dynamic(
  () => import('@/components/pwa/pwa-provider').then((mod) => mod.PwaProvider),
  { ssr: false },
)
