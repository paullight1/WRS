import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../ui.jsx'

/**
 * App-wide notification layer.
 *
 * `useNotify()` from any screen; the host renders a stack that slides in above
 * the bottom bar on a phone and into the bottom-right on desktop. Newest sits
 * on top, at most MAX are visible, each carries its own small illustration.
 *
 *   const notify = useNotify()
 *   notify({ kind: 'success', title: 'Payout confirmed', body: '$42.00 added' })
 *
 * Dismissal: auto after `duration`, on tap, or via the close control. The
 * timer pauses while the toast is hovered or focused, so a long message is
 * never yanked away mid-read.
 */

const MAX = 3
const DEFAULT_DURATION = 4800

const NotifyContext = createContext(null)

/* ------------------------------------------------------------ toast art
   Small, filled, one accent each — legible at 44px, which an outline glyph is
   not. Deliberately the same visual family as the full-size state art. */
const ART = {
  success: (
    <>
      <circle cx="24" cy="24" r="22" fill="#00dbe7" opacity="0.18" />
      <circle cx="24" cy="24" r="15" fill="#00dbe7" />
      <path d="M17 24l5 5 10-11" fill="none" stroke="#00272a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  error: (
    <>
      <circle cx="24" cy="24" r="22" fill="#ffb4ab" opacity="0.18" />
      <path d="M24 9l18 31a3 3 0 0 1-3 4H9a3 3 0 0 1-3-4z" fill="#ffb4ab" />
      <rect x="21.5" y="20" width="5" height="13" rx="2.5" fill="#3b0906" />
      <circle cx="24" cy="37" r="3" fill="#3b0906" />
    </>
  ),
  warning: (
    <>
      <circle cx="24" cy="24" r="22" fill="#f7c948" opacity="0.18" />
      <circle cx="24" cy="24" r="15" fill="#f7c948" />
      <rect x="21.5" y="15" width="5" height="12" rx="2.5" fill="#3a2a00" />
      <circle cx="24" cy="31" r="3" fill="#3a2a00" />
    </>
  ),
  info: (
    <>
      <circle cx="24" cy="24" r="22" fill="#b8c3ff" opacity="0.18" />
      <circle cx="24" cy="24" r="15" fill="#b8c3ff" />
      <circle cx="24" cy="17" r="3" fill="#001355" />
      <rect x="21.5" y="22" width="5" height="12" rx="2.5" fill="#001355" />
    </>
  ),
  reward: (
    <>
      <circle cx="24" cy="24" r="22" fill="#ddb7ff" opacity="0.18" />
      <path d="M24 8l4.6 9.8 10.4 1.4-7.6 7.4 1.9 10.6L24 32.2 14.7 37.2l1.9-10.6L9 19.2l10.4-1.4z" fill="#ddb7ff" />
    </>
  ),
  robot: (
    <>
      <circle cx="24" cy="24" r="22" fill="#3ddc97" opacity="0.18" />
      <rect x="10" y="14" width="28" height="22" rx="8" fill="#3ddc97" />
      <circle cx="18.5" cy="25" r="3.5" fill="#08281c" />
      <circle cx="29.5" cy="25" r="3.5" fill="#08281c" />
      <path d="M24 8v5" stroke="#3ddc97" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
}

function ToastArt({ kind }) {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      {ART[kind] || ART.info}
    </svg>
  )
}

/* ------------------------------------------------------------------ toast */
function Toast({ t, onDismiss }) {
  const [shown, setShown] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef(null)

  const close = useCallback(() => {
    setLeaving(true)
    setTimeout(() => onDismiss(t.id), 220)
  }, [onDismiss, t.id])

  const start = useCallback(() => {
    if (!t.duration) return
    clearTimeout(timer.current)
    timer.current = setTimeout(close, t.duration)
  }, [close, t.duration])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    start()
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer.current)
    }
  }, [start])

  return (
    <div
      role={t.kind === 'error' ? 'alert' : 'status'}
      aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={start}
      onFocus={() => clearTimeout(timer.current)}
      onBlur={start}
      className="surface-raised pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-white/12 bg-surface-container-high/95 p-3 shadow-2xl backdrop-blur-md"
      style={{
        opacity: shown && !leaving ? 1 : 0,
        transform: shown && !leaving ? 'translateY(0) scale(1)' : 'translateY(14px) scale(.96)',
        transition: 'opacity 220ms var(--ease-out), transform 220ms var(--ease-out)',
      }}
    >
      <ToastArt kind={t.kind} />

      <div className="min-w-0 flex-1">
        <p className="text-title-sm text-on-surface">{t.title}</p>
        {t.body && <p className="mt-0.5 text-body-sm text-on-surface-variant">{t.body}</p>}
      </div>

      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action.onClick?.()
            close()
          }}
          className="tap shrink-0 rounded-lg px-3 text-label-md text-primary transition-colors duration-fast hover:bg-primary/15"
        >
          {t.action.label}
        </button>
      )}

      <button
        type="button"
        onClick={close}
        aria-label="Dismiss notification"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-on-surface-variant transition-colors duration-fast hover:bg-white/[.07] hover:text-on-surface"
      >
        <Icon name="close" className="text-[20px]" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ host */
function ToastHost({ items, dismiss }) {
  if (!items.length) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[104px] z-toast flex flex-col items-center gap-2 px-margin-page lg:bottom-8 lg:left-auto lg:right-8 lg:items-end lg:px-0"
      // The stack is decorative chrome; each toast announces itself.
      aria-hidden={false}
    >
      {items.map((t) => (
        <div key={t.id} className="pointer-events-none w-full max-w-[420px]">
          <Toast t={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- provider */
export function NotifyProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)

  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback((opts) => {
    const id = ++seq.current
    const t = {
      id,
      kind: 'info',
      duration: DEFAULT_DURATION,
      ...(typeof opts === 'string' ? { title: opts } : opts),
    }
    // Newest first, oldest pushed out — a stack that grows without bound is
    // just a wall.
    setItems((list) => [t, ...list].slice(0, MAX))
    return id
  }, [])

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <ToastHost items={items} dismiss={dismiss} />
    </NotifyContext.Provider>
  )
}

export function useNotify() {
  const ctx = useContext(NotifyContext)
  if (!ctx) throw new Error('useNotify must be used inside <NotifyProvider>')
  return ctx.notify
}

export function useDismissNotify() {
  return useContext(NotifyContext).dismiss
}
