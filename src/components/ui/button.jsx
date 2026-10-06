import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-container text-white shadow-sm hover:bg-primary-container/90',
        secondary: 'border border-white/10 bg-white/[.04] text-on-surface hover:bg-white/[.08]',
        outline: 'border border-white/12 bg-transparent text-on-surface hover:bg-white/[.06]',
        ghost: 'text-on-surface-variant hover:bg-white/[.06] hover:text-on-surface',
        destructive: 'bg-error/15 text-error hover:bg-error/25',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-lg px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export function Button({
  className,
  variant,
  size,
  asChild = false,
  to,
  full = false,
  loading = false,
  children,
  disabled,
  ...props
}) {
  const Comp = asChild ? Slot : to ? Link : 'button'
  const resolvedVariant = variant === 'primary' ? 'default' : variant === 'danger' ? 'destructive' : variant
  if (asChild) {
    return (
      <Slot
        className={cn(buttonVariants({ variant: resolvedVariant, size }), full && 'w-full', className)}
        aria-busy={loading || undefined}
        {...props}
      >
        {children}
      </Slot>
    )
  }
  return (
    <Comp
      className={cn(buttonVariants({ variant: resolvedVariant, size }), full && 'w-full', className)}
      {...(to ? { to } : {})}
      disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </Comp>
  )
}

export { buttonVariants }
