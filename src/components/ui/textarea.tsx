import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const textareaVariants = cva('', {
  variants: {
    variant: {
      default: 'input-field',
      ghost:
        'min-h-0 w-full resize-none rounded-none border-0 bg-transparent p-0 shadow-none focus:outline-none focus:ring-0',
      soft: 'min-h-[4.5rem] w-full resize-none rounded-2xl border-0 bg-muted/60 p-3 text-sm shadow-none focus-visible:ring-1',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea ref={ref} className={cn(textareaVariants({ variant }), className)} {...props} />
    )
  },
)
Textarea.displayName = 'Textarea'

export { textareaVariants }
