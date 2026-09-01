import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] text-sm font-medium shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground hover:bg-accent/90',
        secondary: 'border border-border bg-surface text-foreground hover:bg-surface-subtle',
        outline: 'border border-border bg-transparent hover:bg-surface-subtle',
        ghost: 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
        link: 'text-muted-foreground underline-offset-4 hover:text-foreground hover:underline',
        destructive: 'text-destructive hover:bg-destructive/10',
        hero: 'bg-hero text-hero-foreground border border-border hover:bg-surface-subtle',
        brand: 'bg-brand text-brand-foreground hover:bg-brand/90',
      },
      size: {
        default: 'h-9 px-3.5',
        sm: 'h-8 px-2.5 text-xs',
        xs: 'h-7 px-2 text-xs font-normal',
        lg: 'h-10 px-5',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { buttonVariants }
