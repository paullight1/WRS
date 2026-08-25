import { useState } from 'react'
import { Link } from 'react-router-dom'

/* --------------------------------------------------------------- accents
   Vivid solid fills for icon tiles and coloured cards. Every value clears
   3:1 against white so the glyph on top stays legible. */
export const ACCENTS = {
  blue: '#2f6bff',
  indigo: '#5b4bff',
  violet: '#8b2fd6',
  pink: '#d81b7a',
  red: '#dc3a3f',
  orange: '#d9660f',
  amber: '#b07d00',
  teal: '#0f8fa0',
  green: '#128b57',
  slate: '#4a5570',
}

/* ---------------------------------------------------------------- tone map */
// Tailwind needs literal class names, so tones resolve through a static map.
// `chip` is the bright solid tile; `bg`/`border` remain the quiet tint.
export const tones = {
  primary: {
    text: 'text-primary',
    bg: 'bg-primary/20',
    border: 'border-primary/40',
    solid: 'bg-primary-container',
    accent: ACCENTS.blue,
  },
  secondary: {
    text: 'text-secondary',
    bg: 'bg-secondary/20',
    border: 'border-secondary/40',
    solid: 'bg-secondary-container',
    accent: ACCENTS.violet,
  },
  tertiary: {
    text: 'text-tertiary',
    bg: 'bg-tertiary/20',
    border: 'border-tertiary/40',
    solid: 'bg-tertiary-container',
    accent: ACCENTS.teal,
  },
  error: {
    text: 'text-error',
    bg: 'bg-error/20',
    border: 'border-error/40',
    solid: 'bg-error-container',
    accent: ACCENTS.red,
  },
  success: {
    text: 'text-success',
    bg: 'bg-success/20',
    border: 'border-success/40',
    solid: 'bg-success/60',
    accent: ACCENTS.green,
  },
  gold: {
    text: 'text-[#f7c948]',
    bg: 'bg-[#f7c948]/20',
    border: 'border-[#f7c948]/30',
    solid: 'bg-[#f7c948]',
    accent: ACCENTS.amber,
  },
  outline: {
    text: 'text-on-surface-variant',
    bg: 'bg-white/[.06]',
    border: 'border-white/12',
    solid: 'bg-surface-variant',
    accent: ACCENTS.slate,
  },
  'on-surface': {
    text: 'text-on-surface',
    bg: 'bg-white/[.06]',
    border: 'border-white/12',
    solid: 'bg-surface-variant',
    accent: ACCENTS.slate,
  },
}
export const tone = (t) => tones[t] || tones.primary
export const accentOf = (t) => tone(t).accent

/* -------------------------------------------------------------- icon tile
   The house style for every icon in the app: solid vivid square, white glyph. */
export function IconTile({ icon, t = 'primary', accent, size = 40, radius = 12, iconSize, className = '' }) {
  const bg = accent || accentOf(t)
  return (
    <span
      className={`grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg }}
    >
      <Icon name={icon} fill className="text-white" size={iconSize || Math.round(size * 0.52)} />
    </span>
  )
}

/* ------------------------------------------------------------------- icon */
export function Icon({ name, className = '', fill = false, size }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      {name}
    </span>
  )
}

/* -------------------------------------------------------------- icon chip */
/** Flat colour chip. `to` is kept for call-site compatibility (border only). */
export function GradIcon({ icon, from, to, size = 44, radius = 12, className = '', fill = true }) {
  return (
    <span
      className={`grid shrink-0 place-items-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: from,
        border: `1px solid ${to || from}`,
      }}
    >
      <Icon name={icon} fill={fill} className="text-white" size={size * 0.46} />
    </span>
  )
}

/* ------------------------------------------------------------------- ring */
/** Circular progress dial for a single headline metric. */
export function Ring({ value = 0, size = 78, stroke = 6, color = '#00dbe7', label, sub, children, className = '' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={`relative grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * pct) / 100}
          style={{ transition: 'stroke-dashoffset var(--dur-slow) var(--ease-out)' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-content-center text-center leading-tight">
        {children ?? (
          <>
            {label && <span className="block text-label-sm text-on-surface-variant">{label}</span>}
            {sub && <span className="tnum block font-headline-md text-headline-md text-on-surface">{sub}</span>}
          </>
        )}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------- card */
/**
 * Opaque panel. Never nest one inside another.
 * Pass `accent` (hex or tone name) to wash the card in that colour.
 */
export function Card({ className = '', children, as: As = 'div', accent, ...rest }) {
  const hex = accent ? ACCENTS[accent] || tones[accent]?.accent || accent : null
  return (
    <As
      className={`${hex ? 'rounded-2xl border' : 'surface rounded-2xl'} ${className}`}
      style={hex ? { backgroundColor: `${hex}26`, borderColor: `${hex}59` } : undefined}
      {...rest}
    >
      {children}
    </As>
  )
}

/* ------------------------------------------------------------------- list
   Grouped list: one container, hairline-separated rows. Replaces stacks of
   individually-boxed cards, which is what made every screen look the same. */
export function List({ children, className = '', inset = true }) {
  return (
    <div className={`${inset ? 'surface rounded-2xl' : ''} divide-hairline overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------- row */
export function Row({
  icon,
  iconNode,
  t = 'primary',
  accent,
  title,
  subtitle,
  value,
  meta,
  right,
  to,
  onClick,
  className = '',
  children,
}) {
  const interactive = Boolean(to || onClick)

  const body = (
    <>
      {iconNode}
      {!iconNode && icon && <IconTile icon={icon} t={t} accent={accent} size={40} radius={12} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-title text-on-surface">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-body-sm text-on-surface-variant">{subtitle}</span>}
        {children}
      </span>
      {value && (
        <span className="tnum shrink-0 text-right">
          <span className="block text-title text-on-surface">{value}</span>
          {meta && <span className="mt-0.5 block text-label-sm text-on-surface-variant">{meta}</span>}
        </span>
      )}
      {right}
      {interactive && !right && !value && <Icon name="chevron_right" className="shrink-0 text-outline" />}
    </>
  )

  const cls = `tap flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors duration-fast ${
    interactive ? 'hover:bg-white/[.04] active:bg-white/[.07]' : ''
  } ${className}`

  if (to)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    )
  return <div className={cls}>{body}</div>
}

/** Back-compat: standalone boxed row. Prefer <List><Row/></List>. */
export function ListRow(props) {
  return (
    <List className={props.className}>
      <Row {...props} className="" />
    </List>
  )
}

/* --------------------------------------------------------------- data row */
/** Label left, figure right. For anything that is fundamentally a readout. */
export function DataRow({ label, value, valueClass = 'text-on-surface', meta }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="text-body-md text-on-surface-variant">{label}</span>
      <span className="shrink-0 text-right">
        <span className={`tnum text-title ${valueClass}`}>{value}</span>
        {meta && <span className="ml-2 text-label-sm text-on-surface-variant">{meta}</span>}
      </span>
    </div>
  )
}

/* ----------------------------------------------------------------- button */
const btnVariants = {
  primary: 'bg-primary-container text-white hover:bg-[#2450e6] active:bg-[#1f47cc]',
  tonal: 'bg-surface-container-high text-on-surface hover:bg-surface-variant active:bg-surface-bright',
  ghost: 'border border-white/15 text-on-surface hover:bg-white/[.06] active:bg-white/[.09]',
  tertiary: 'bg-tertiary/12 border border-tertiary/30 text-tertiary hover:bg-tertiary/20',
  danger: 'bg-error/12 border border-error/30 text-error hover:bg-error/20',
  quiet: 'text-primary hover:bg-primary/20',
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
  loading = false,
  disabled,
  ...rest
}) {
  const sizes = {
    sm: 'min-h-[36px] px-3.5 text-label-sm gap-1.5',
    md: 'min-h-[44px] px-5 text-label-md gap-2',
    lg: 'min-h-[52px] px-6 text-label-md gap-2',
  }
  const cls = `inline-flex items-center justify-center rounded-xl transition-colors duration-fast ease-out disabled:opacity-45 disabled:pointer-events-none ${
    btnVariants[variant]
  } ${sizes[size]} ${full ? 'w-full' : ''} ${className}`

  const inner = (
    <>
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && <Icon name={icon} className="text-[18px]" />
      )}
      <span>{children}</span>
      {trailingIcon && !loading && <Icon name={trailingIcon} className="text-[18px]" />}
    </>
  )

  if (to && !disabled)
    return (
      <Link to={to} className={cls} {...rest}>
        {inner}
      </Link>
    )
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {inner}
    </button>
  )
}

/* ------------------------------------------------------------------- chip */
export function Chip({ children, active, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`tap inline-flex items-center whitespace-nowrap rounded-full px-4 text-label-md transition-colors duration-fast ${
        active
          ? 'bg-primary-container text-white'
          : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/* --------------------------------------------------------------- chip bar
   Filters used to sit in a horizontal scroller, which cut labels in half at
   the right edge ("Languag…", "Develo…"). Now they wrap, and anything past
   the first row collapses behind a More control — nothing is ever clipped. */
export function ChipBar({ items, value, onChange, visible = 3, className = '' }) {
  const [expanded, setExpanded] = useState(false)

  // Collapsed: the first few plus the current selection, so the active
  // filter is never the one hidden.
  const shown = expanded
    ? items
    : (() => {
        const head = items.slice(0, visible)
        if (value && items.includes(value) && !head.includes(value)) {
          return [...head.slice(0, Math.max(1, visible - 1)), value]
        }
        return head
      })()

  const hidden = items.length - shown.length

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {shown.map((it) => (
        <Chip key={it} active={value === it} onClick={() => onChange(it)}>
          {it}
        </Chip>
      ))}

      {hidden > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          className="tap inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-white/15 px-3.5 text-label-md text-on-surface-variant transition-colors duration-fast hover:bg-white/[.06] hover:text-on-surface"
        >
          More
          <span className="tnum text-on-surface-variant">{hidden}</span>
          <Icon name="expand_more" className="text-[17px]" />
        </button>
      )}

      {expanded && items.length > visible && (
        <button
          onClick={() => setExpanded(false)}
          aria-expanded
          className="tap inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-white/15 px-3.5 text-label-md text-on-surface-variant transition-colors duration-fast hover:bg-white/[.06] hover:text-on-surface"
        >
          Less
          <Icon name="expand_less" className="text-[17px]" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ badge */
/** Sentence case, not tracked caps — status reads faster without shouting. */
export function Badge({ children, t = 'tertiary', className = '' }) {
  const c = tone(t)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-label-sm ${c.bg} ${c.border} ${c.text} ${className}`}
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
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label && <span className="text-label-sm">{label}</span>}
    </span>
  )
}

/* --------------------------------------------------------------- progress */
export function Progress({ value, className = '', height = 'h-1.5', color = 'bg-tertiary', label }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`${height} w-full overflow-hidden rounded-full bg-white/10 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-slow ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ------------------------------------------------------------ section head */
export function SectionTitle({ children, action, to, className = '' }) {
  return (
    <div className={`mb-3 flex items-baseline justify-between gap-4 ${className}`}>
      <h2 className="font-headline-md text-headline-md text-on-surface">{children}</h2>
      {action &&
        (to ? (
          <Link to={to} className="shrink-0 text-label-md text-primary hover:underline">
            {action}
          </Link>
        ) : (
          <span className="shrink-0 text-label-sm text-on-surface-variant">{action}</span>
        ))}
    </div>
  )
}

/** Small caption. Sentence case — the tracked-caps eyebrow is retired. */
export function Eyebrow({ children, className = '' }) {
  return <p className={`text-label-sm text-on-surface-variant ${className}`}>{children}</p>
}

/* ------------------------------------------------------------------- stat */
export function Stat({ label, value, t = 'on-surface', icon, className = '' }) {
  const c = tone(t)
  return (
    <div className={`surface rounded-xl px-3 py-3.5 ${className}`}>
      {icon && <Icon name={icon} className={`${c.text} mb-1.5 text-[18px]`} />}
      <p className={`tnum font-headline-md text-headline-md ${c.text}`}>{value}</p>
      <p className="mt-0.5 text-label-sm text-on-surface-variant">{label}</p>
    </div>
  )
}

/* ------------------------------------------------------------------- tabs */
export function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`surface flex gap-1 rounded-xl p-1 ${className}`}>
      {items.map((it) => (
        <button
          key={it}
          role="tab"
          aria-selected={value === it}
          onClick={() => onChange(it)}
          className={`min-h-[40px] flex-1 whitespace-nowrap rounded-lg px-3 text-label-md transition-colors duration-fast ${
            value === it
              ? 'bg-surface-container-highest text-on-surface'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {it}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ field */
export function Field({ label, hint, error, icon, className = '', id, ...rest }) {
  const inputId = id || `f-${label?.replace(/\W+/g, '-').toLowerCase() || rest.placeholder?.slice(0, 8)}`
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-label-md text-on-surface-variant">
          {label}
        </label>
      )}
      <div
        className={`flex min-h-[48px] items-center gap-2.5 rounded-xl border bg-surface-container px-3.5 transition-colors duration-fast focus-within:border-primary ${
          error ? 'border-error' : 'border-white/12'
        }`}
      >
        {icon && <Icon name={icon} className="text-[20px] text-on-surface-variant" />}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline"
          {...rest}
        />
      </div>
      {(hint || error) && (
        <p className={`mt-1.5 text-label-sm ${error ? 'text-error' : 'text-on-surface-variant'}`}>{error || hint}</p>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- toggle */
export function Toggle({ checked, onChange, label, desc }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="tap flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-fast hover:bg-white/[.04]"
    >
      <span className="min-w-0">
        <span className="block text-title text-on-surface">{label}</span>
        {desc && <span className="mt-0.5 block text-body-sm text-on-surface-variant">{desc}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-fast ${
          checked ? 'bg-primary-container' : 'bg-surface-variant'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-[left] duration-fast ease-out ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}

/* --------------------------------------------------------------- skeleton */
export function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  return <div className={`animate-pulse bg-white/[.07] ${rounded} ${className}`} />
}

export function SkeletonRows({ rows = 3 }) {
  return (
    <List>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
          <Skeleton className="h-10 w-10" rounded="rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </List>
  )
}

/* ------------------------------------------------------------------ empty */
/** Empty states teach the next action rather than announcing emptiness. */
export function EmptyState({ icon = 'inbox', title, desc, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/12 bg-white/[.04]">
        <Icon name={icon} className="text-[26px] text-on-surface-variant" />
      </span>
      <p className="font-headline-md text-headline-md text-on-surface">{title}</p>
      {desc && <p className="max-w-[34ch] text-body-md text-on-surface-variant">{desc}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ toast */
export function Toast({ show, message, icon = 'check_circle', t = 'tertiary' }) {
  const c = tone(t)
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-[104px] z-toast flex justify-center px-margin-page transition-all duration-slow ease-out ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <div className="surface-raised flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-lg">
        <Icon name={icon} className={`${c.text} text-[20px]`} fill />
        <span className="text-label-md text-on-surface">{message}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- disclosure */
export function Disclosure({ children, icon = 'info' }) {
  return (
    <p className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[.03] px-3.5 py-3 text-body-sm leading-relaxed text-on-surface-variant">
      <Icon name={icon} className="mt-0.5 shrink-0 text-[16px]" />
      <span>{children}</span>
    </p>
  )
}
