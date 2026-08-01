import { Link } from 'react-router-dom'

/* ---------------------------------------------------------------- tone map */
// Tailwind needs literal class names, so tones resolve through a static map.
export const tones = {
  primary: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', ring: 'ring-primary/30', solid: 'bg-primary-container' },
  secondary: { text: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20', ring: 'ring-secondary/30', solid: 'bg-secondary-container' },
  tertiary: { text: 'text-tertiary', bg: 'bg-tertiary/10', border: 'border-tertiary/20', ring: 'ring-tertiary/30', solid: 'bg-tertiary-container' },
  error: { text: 'text-error', bg: 'bg-error/10', border: 'border-error/20', ring: 'ring-error/30', solid: 'bg-error-container' },
  success: { text: 'text-success', bg: 'bg-success/10', border: 'border-success/20', ring: 'ring-success/30', solid: 'bg-success/60' },
  gold: {
    text: 'text-[#f7c948]',
    bg: 'bg-[#f7c948]/10',
    border: 'border-[#f7c948]/30',
    ring: 'ring-[#f7c948]/30',
    solid: 'bg-[#f7c948]',
  },
  outline: { text: 'text-outline', bg: 'bg-white/5', border: 'border-white/10', ring: 'ring-white/10', solid: 'bg-surface-variant' },
  'on-surface': { text: 'text-on-surface', bg: 'bg-white/5', border: 'border-white/10', ring: 'ring-white/10', solid: 'bg-surface-variant' },
}
export const tone = (t) => tones[t] || tones.primary

/* ------------------------------------------------------------------- icon */
export function Icon({ name, className = '', fill = false, size }) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      {name}
    </span>
  )
}

/* ------------------------------------------------------------------- card */
export function Card({ className = '', children, as: As = 'div', ...rest }) {
  return (
    <As className={`glass rounded-2xl ${className}`} {...rest}>
      {children}
    </As>
  )
}

/* ----------------------------------------------------------------- button */
const btnVariants = {
  primary:
    'grad-primary text-white shadow-lg glow-primary hover:brightness-110',
  tonal: 'bg-surface-container-high/70 border border-white/10 text-on-surface hover:bg-surface-variant/40',
  ghost: 'border border-white/10 text-on-surface hover:bg-white/5',
  tertiary: 'bg-tertiary/10 border border-tertiary/30 text-tertiary hover:bg-tertiary/20',
  danger: 'bg-error/10 border border-error/30 text-error hover:bg-error/20',
}

export function Button({
  children,
  variant = 'primary',
  icon,
  trailingIcon,
  className = '',
  to,
  full,
  size = 'md',
  ...rest
}) {
  const sizes = { sm: 'px-4 py-2 text-label-sm', md: 'px-6 py-3 text-label-md', lg: 'px-8 py-4 text-label-md' }
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl font-label-md tracking-tight transition-all active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none ${
    btnVariants[variant]
  } ${sizes[size]} ${full ? 'w-full' : ''} ${className}`
  const inner = (
    <>
      {icon && <Icon name={icon} className="text-[18px]" />}
      <span>{children}</span>
      {trailingIcon && <Icon name={trailingIcon} className="text-[18px]" />}
    </>
  )
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>
  return <button className={cls} {...rest}>{inner}</button>
}

/* ------------------------------------------------------------------- chip */
export function Chip({ children, active, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-5 py-2 text-label-sm font-label-sm transition-all ${
        active
          ? 'bg-primary-container text-white shadow-md'
          : 'bg-surface-container-high/70 border border-white/5 text-on-surface-variant hover:bg-surface-variant/40'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ badge */
export function Badge({ children, t = 'tertiary', className = '' }) {
  const c = tone(t)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-label-sm uppercase tracking-widest ${c.bg} ${c.border} ${c.text} ${className}`}
    >
      {children}
    </span>
  )
}

/* -------------------------------------------------------------- statusdot */
export function StatusDot({ t = 'tertiary', label }) {
  const c = tone(t)
  return (
    <span className={`inline-flex items-center gap-2 ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current animate-breathe`} />
      {label && <span className="text-label-sm font-label-sm">{label}</span>}
    </span>
  )
}

/* --------------------------------------------------------------- progress */
export function Progress({ value, className = '', showShimmer = true, height = 'h-2' }) {
  return (
    <div className={`${height} w-full overflow-hidden rounded-full bg-surface-container-highest/70 ${className}`}>
      <div
        className="relative h-full rounded-full grad-line transition-all duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, boxShadow: '0 0 12px rgba(0,219,231,.45)' }}
      >
        {showShimmer && <span className="absolute inset-0 shimmer-bar opacity-50" />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ section head */
export function SectionTitle({ children, action, to, className = '' }) {
  return (
    <div className={`mb-4 flex items-end justify-between gap-4 ${className}`}>
      <h2 className="font-headline-md text-[19px] font-semibold tracking-tight text-on-surface">{children}</h2>
      {action &&
        (to ? (
          <Link to={to} className="flex items-center gap-1 text-label-sm font-label-sm text-primary hover:text-tertiary">
            {action} <Icon name="chevron_right" className="text-[16px]" />
          </Link>
        ) : (
          <span className="text-label-sm font-label-sm text-outline">{action}</span>
        ))}
    </div>
  )
}

export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`text-label-sm font-label-sm uppercase tracking-[0.2em] text-outline ${className}`}>{children}</p>
  )
}

/* ---------------------------------------------------------------- listrow */
export function ListRow({ icon, t = 'primary', title, subtitle, right, to, onClick, className = '', children }) {
  const c = tone(t)
  const body = (
    <>
      {icon && (
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${c.bg} ${c.border}`}>
          <Icon name={icon} className={`${c.text} text-[22px]`} fill />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-md font-medium text-on-surface">{title}</span>
        {subtitle && <span className="block truncate text-label-sm font-label-sm text-outline">{subtitle}</span>}
        {children}
      </span>
      {right ?? <Icon name="chevron_right" className="shrink-0 text-outline" />}
    </>
  )
  const cls = `glass flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all hover:border-white/20 hover:bg-white/[.04] active:scale-[.99] ${className}`
  if (to) return <Link to={to} className={cls}>{body}</Link>
  return (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  )
}

/* ------------------------------------------------------------------- stat */
export function Stat({ label, value, t = 'on-surface', icon, className = '' }) {
  const c = tone(t)
  return (
    <div className={`glass rounded-2xl p-4 text-center ${className}`}>
      {icon && <Icon name={icon} className={`${c.text} mb-1 text-[20px]`} />}
      <p className="text-label-sm font-label-sm text-outline">{label}</p>
      <p className={`font-headline-md text-[20px] font-semibold ${c.text}`}>{value}</p>
    </div>
  )
}

/* ------------------------------------------------------------------- tabs */
export function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div className={`glass flex gap-1 rounded-full p-1 ${className}`}>
      {items.map((it) => (
        <button
          key={it}
          onClick={() => onChange(it)}
          className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-label-sm font-label-sm transition-all ${
            value === it ? 'bg-primary-container text-white shadow' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {it}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ field */
export function Field({ label, hint, icon, className = '', ...rest }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-2 block text-label-sm font-label-sm text-on-surface-variant">{label}</span>}
      <span className="glass flex items-center gap-3 rounded-xl px-4 py-3 transition-all focus-within:border-tertiary/60 focus-within:shadow-[0_0_15px_rgba(0,219,231,.18)]">
        {icon && <Icon name={icon} className="text-[20px] text-outline" />}
        <input
          className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline/60"
          {...rest}
        />
      </span>
      {hint && <span className="mt-1.5 block text-label-sm font-label-sm text-outline">{hint}</span>}
    </label>
  )
}

/* ----------------------------------------------------------------- toggle */
export function Toggle({ checked, onChange, label, desc }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="glass flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left transition-all hover:border-white/20"
    >
      <span>
        <span className="block text-body-md text-on-surface">{label}</span>
        {desc && <span className="block text-label-sm font-label-sm text-outline">{desc}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary-container' : 'bg-surface-variant'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ empty */
export function EmptyState({ icon = 'inbox', title, desc, action }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/5">
        <Icon name={icon} className="text-[28px] text-outline" />
      </span>
      <p className="font-headline-md text-[17px] text-on-surface">{title}</p>
      {desc && <p className="max-w-xs text-body-md text-outline">{desc}</p>}
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ toast */
export function Toast({ show, message, icon = 'check_circle', t = 'tertiary' }) {
  const c = tone(t)
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-28 z-[70] flex justify-center px-margin-page transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className={`glass-strong flex items-center gap-3 rounded-full px-5 py-3 shadow-2xl ${c.border}`}>
        <Icon name={icon} className={`${c.text} text-[20px]`} fill />
        <span className="text-label-md font-label-md text-on-surface">{message}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- disclosure */
export function Disclosure({ children, icon = 'info' }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[.03] p-3 text-label-sm font-label-sm leading-relaxed text-outline">
      <Icon name={icon} className="mt-[1px] shrink-0 text-[16px]" />
      <span>{children}</span>
    </p>
  )
}
