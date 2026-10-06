import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button, Icon } from './ui.jsx'
import StateArt from './states/StateArt.jsx'

/* One-time getting-started dialog for each account's first visit to Home. */
export const WELCOME_FLAG = 'wrs.welcome.pending'
const ONBOARDING_SEEN_PREFIX = 'wrs.onboarding.seen.'

export function hasSeenOnboarding(userId) {
  if (!userId) return true
  try {
    return localStorage.getItem(`${ONBOARDING_SEEN_PREFIX}${userId}`) === '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen(userId) {
  if (!userId) return
  try {
    localStorage.setItem(`${ONBOARDING_SEEN_PREFIX}${userId}`, '1')
  } catch {
    /* private mode — onboarding can be shown again next visit */
  }
}

/** Preserve the welcome dialog when robot setup finishes before Home mounts. */
export function armWelcome() {
  try {
    localStorage.setItem(WELCOME_FLAG, '1')
  } catch {
    /* private mode — the modal simply will not show */
  }
}

export function consumeWelcome() {
  try {
    if (localStorage.getItem(WELCOME_FLAG) !== '1') return false
    localStorage.removeItem(WELCOME_FLAG)
    return true
  } catch {
    return false
  }
}

const NEXT = [
  { icon: 'smart_toy', label: 'Your robot', desc: 'View its setup and capabilities', to: '/robot' },
  { icon: 'model_training', label: 'Train', desc: 'Teach it through training activities', to: '/training' },
  { icon: 'paid', label: 'Mine RoboCoin', desc: 'Choose a robot and start a mining cycle', to: '/deploy' },
]

export default function WelcomeModal({ open, onClose, robotName }) {
  const panel = useRef(null)
  const restoreTo = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    restoreTo.current = document.activeElement
    // Focus the first control in the panel. Button renders a Link when given
    // `to` and does not forward refs, so this is queried rather than held.
    panel.current?.querySelector('a[href], button:not([disabled])')?.focus()
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      // Keep focus inside the dialog.
      const f = panel.current.querySelectorAll('a[href], button:not([disabled])')
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      restoreTo.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-drawer grid place-items-end sm:place-items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="wrs-fade-in absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="wrs-rise-in relative w-full max-w-[440px] rounded-t-3xl border border-white/12 bg-surface-container p-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:rounded-3xl sm:pb-6"
      >
        <div className="flex flex-col items-center text-center">
          <StateArt kind="welcome" size={140} />
          <p className="mt-3 text-label-md text-tertiary">A quick guide to your workspace</p>
          <h2 id="welcome-title" className="mt-1 font-headline-lg text-headline-lg text-on-surface">
            Welcome to WRS
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {robotName ? `${robotName} is ready. ` : ''}Build capability with training, then put your robot to work mining.
          </p>
        </div>

        <ul className="mt-6 space-y-1">
          {NEXT.map((n) => (
            <li key={n.label}>
              <Link
                to={n.to}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl bg-white/[.04] px-3.5 py-3 transition-colors hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Icon name={n.icon} className="shrink-0 text-[20px] text-primary" fill />
                <span className="min-w-0 flex-1">
                  <span className="block text-title-sm text-on-surface">{n.label}</span>
                  <span className="mt-0.5 block text-body-sm text-on-surface-variant">{n.desc}</span>
                </span>
                <Icon name="arrow_forward" className="shrink-0 text-[18px] text-on-surface-variant" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2">
          <Button to={robotName ? '/robot' : '/onboarding'} full size="lg" trailingIcon="arrow_forward" onClick={onClose}>
            {robotName ? 'View my robot' : 'Create my robot'}
          </Button>
          <Button variant="ghost" full size="lg" onClick={onClose}>
            Look around first
          </Button>
        </div>
      </div>
    </div>
  )
}
