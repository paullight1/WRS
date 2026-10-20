import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  { icon: 'smart_toy', label: 'Set up your robot', desc: 'Make it yours' },
  { icon: 'model_training', label: 'Train your robot', desc: 'Help it learn new skills' },
  { icon: 'paid', label: 'Start mining', desc: 'Earn RoboCoin with your robot' },
]

export default function WelcomeModal({ open, onClose, robotName }) {
  const panel = useRef(null)
  const restoreTo = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    restoreTo.current = document.activeElement
    panel.current?.querySelector('a[href], button:not([disabled])')?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
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
      document.body.style.overflow = previousOverflow
      restoreTo.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-drawer grid place-items-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6">
      <div className="absolute inset-0" aria-hidden="true" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-description"
        className="wrs-rise-in relative my-auto w-full max-w-[440px] overflow-y-auto rounded-3xl border border-white/12 bg-surface-container p-5 sm:p-6"
        style={{
          maxHeight:
            'calc(100dvh - max(24px, env(safe-area-inset-top)) - max(24px, env(safe-area-inset-bottom)))',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex flex-col items-center text-center">
          <StateArt kind="welcome" size={112} />
          <p className="mt-2 text-label-md text-tertiary">Your first steps</p>
          <h2 id="welcome-title" className="mt-1 font-headline-lg text-headline-lg text-on-surface">
            Welcome to WRS
          </h2>
          <p id="welcome-description" className="mt-2 max-w-sm text-body-md text-on-surface-variant">
            {robotName ? `${robotName} is ready. ` : ''}Please review these steps before continuing. Set up your robot,
            help it learn, then earn RoboCoin.
          </p>
        </div>

        <ol className="mt-5 space-y-2">
          {NEXT.map((step, index) => (
            <li key={step.label}>
              <div className="flex items-center gap-3 rounded-xl bg-white/[.04] px-3.5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <span className="sr-only">Step {index + 1}: </span>
                  <Icon name={step.icon} className="text-[20px]" fill />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-title-sm text-on-surface">{step.label}</span>
                  <span className="mt-0.5 block text-body-sm text-on-surface-variant">{step.desc}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5">
          <Button full size="lg" trailingIcon="arrow_forward" onClick={onClose}>
            Continue to Home
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
