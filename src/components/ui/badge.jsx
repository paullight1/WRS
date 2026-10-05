import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn.js'

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'border-primary/25 bg-primary/10 text-primary',
      secondary: 'border-white/10 bg-white/[.06] text-on-surface-variant',
      success: 'border-success/25 bg-success/10 text-success',
      warning: 'border-[#f7c948]/25 bg-[#f7c948]/10 text-[#f7c948]',
      destructive: 'border-error/25 bg-error/10 text-error',
      outline: 'border-white/12 text-on-surface-variant',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
