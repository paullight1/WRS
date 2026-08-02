import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button, Icon } from './ui.jsx'
import StateArt from './states/StateArt.jsx'
import { robot } from '../data/mock.js'

/* Shown once, the first time a new owner reaches Home after building their
   robot. It names the robot and points at exactly one next action — the moment
   is worth marking, but the screen behind it is where the work happens. */
export const WELCOME_FLAG = 'wrs.welcome.pending'

/** Called at the end of onboarding; Home picks this up on its next render. */
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
  { icon: 'model_training', label: 'Train it', desc: 'Teach voice, language and movement' },
  { icon: 'dataset', label: 'Contribute data', desc: 'Short tasks that raise its quality score' },
  { icon: 'rocket_launch', label: 'Deploy it', desc: 'Send it to work in a sector' },
]

export default function WelcomeModal({ open, onClose }) {
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
          <p className="mt-3 text-label-md text-tertiary">Your robot is ready</p>
          <h2 id="welcome-title" className="mt-1 font-headline-lg text-headline-lg text-on-surface">
            Meet {robot.name}
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {robot.unit} · {robot.robotClass}. It is yours — everything from here makes it more capable.
          </p>
        </div>

        <ul className="mt-6 space-y-1">
          {NEXT.map((n) => (
            <li key={n.label} className="flex items-center gap-3 rounded-xl bg-white/[.04] px-3.5 py-3">
              <Icon name={n.icon} className="shrink-0 text-[20px] text-primary" fill />
              <span className="min-w-0">
                <span className="block text-title-sm text-on-surface">{n.label}</span>
                <span className="mt-0.5 block text-body-sm text-on-surface-variant">{n.desc}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2">
          <Button to="/training" full size="lg" trailingIcon="arrow_forward" onClick={onClose}>
            Start training
          </Button>
          <Button variant="ghost" full size="lg" onClick={onClose}>
            Look around first
          </Button>
        </div>
      </div>
    </div>
  )
}
