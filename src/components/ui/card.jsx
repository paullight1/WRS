import { cn } from '../../lib/cn.js'

export function Card({ className, ...props }) {
  return (
    <section className={cn('rounded-xl border border-white/[.08] bg-surface-container-low', className)} {...props} />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h2 className={cn('font-headline-md text-headline-md text-on-surface', className)} {...props}>
      {children}
    </h2>
  )
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm leading-6 text-on-surface-variant', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
}
