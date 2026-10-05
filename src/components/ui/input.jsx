import { cn } from '../../lib/cn.js'

export const inputClassName =
  'flex h-10 w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-on-surface shadow-sm placeholder:text-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-50'

export const Input = ({ className, ...props }) => <input className={cn(inputClassName, className)} {...props} />

export const Textarea = ({ className, ...props }) => (
  <textarea className={cn(inputClassName, 'min-h-24 resize-y py-2.5', className)} {...props} />
)
