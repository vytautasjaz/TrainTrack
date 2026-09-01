'use client'

import { Library, PanelRightOpen } from 'lucide-react'
import { useTrainingLibrary } from '@/components/training/training-library-context'
import { ToolbarTextToggle } from '@/components/training/plan-sport-filter-bar'
import { cn } from '@/lib/utils'

/** Library open/close — icon only; group label sits above in the toolbar. */
export function TrainingLibraryToolbarToggle({
  className,
}: {
  className?: string
}) {
  const library = useTrainingLibrary()
  if (!library) return null

  return (
    <ToolbarTextToggle
      pressed={library.open}
      onClick={library.toggle}
      title={library.open ? 'Hide workout library' : 'Show workout library'}
      className={cn(
        'hidden font-semibold text-foreground hover:text-foreground lg:inline-flex [&_svg]:opacity-100',
        className,
      )}
    >
      {library.open ? (
        <Library className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <PanelRightOpen className="h-3.5 w-3.5" aria-hidden />
      )}
    </ToolbarTextToggle>
  )
}
