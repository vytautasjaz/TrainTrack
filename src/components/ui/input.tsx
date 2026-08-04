import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const inputVariants = cva('', {
  variants: {
    variant: {
      default: 'input-field',
      table: 'input-field h-8 min-h-0 px-2 py-0',
      inline:
        'w-auto min-h-0 rounded-none border-0 border-b border-border/70 bg-transparent px-0.5 pb-0.5 text-sm shadow-none transition-colors hover:border-border focus:border-foreground/50 focus:bg-transparent focus:outline-none focus:ring-0',
      ghost:
        'w-full min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none focus:outline-none focus:ring-0 hover:bg-transparent hover:border-transparent',
      embedded:
        'h-10 w-full min-h-0 rounded-none border-0 bg-transparent shadow-none outline-none focus:ring-0 hover:bg-transparent hover:border-transparent',
    },
    size: {
      default: '',
      compact: '!w-28 py-1 text-sm sm:!w-32',
      compactMono: '!w-28 py-1 font-mono text-sm tabular-nums sm:!w-32',
      narrow: '!w-full max-w-[7.5rem] py-1 text-sm tabular-nums sm:max-w-[8rem]',
      narrowMono:
        '!w-full max-w-[7.5rem] py-1 font-mono text-sm tabular-nums sm:max-w-[8rem]',
    },
    align: {
      left: '',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
    align: 'left',
  },
})

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, align, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, align }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { inputVariants }
