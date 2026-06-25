'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BackButtonProps = {
  fallbackHref?: string
  variant?: 'button' | 'link'
  size?: 'sm' | 'default'
  className?: string
}

export function BackButton({
  fallbackHref = '/dashboard',
  variant = 'button',
  size = 'sm',
  className,
}: BackButtonProps) {
  const router = useRouter()

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    if (fallbackHref) router.push(fallbackHref)
  }

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={handleBack}
        className={cn(
          'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground',
          className,
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn('gap-1', className)}
      onClick={handleBack}
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </Button>
  )
}
