import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Card, Field, Icon, Disclosure } from '../components/ui.jsx'

const STEPS = [
  { n: 1, title: 'Your details', desc: 'How we reach you and verify your account.' },
  { n: 2, title: 'Secure it', desc: 'Set a password and accept the terms.' },
]

export default function Register() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [agree, setAgree] = useState(false)
  const current = STEPS[step - 1]

  return (
    <div className="relative min-h-screen px-margin-page py-10">
      <div className="mx-auto w-full max-w-sm">
        {/* -------------------------------------------------------- header */}
        <button
          onClick={() => (step === 1 ? nav('/') : setStep(1))}
          className="mb-6 inline-flex items-center gap-2 text-label-sm text-outline transition-colors hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          {step === 1 ? 'Back' : 'Your details'}
        </button>

        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Create your WRS account</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">{current.desc}</p>

        {/* ------------------------------------------------ step indicator */}
        <div className="mb-6 mt-5 flex items-center gap-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] transition-colors ${
                  s.n < step
                    ? 'bg-tertiary text-on-tertiary'
                    : s.n === step
                      ? 'bg-primary-container text-white'
                      : 'border border-white/15 text-outline'
                }`}
              >
                {s.n < step ? <Icon name="check" className="text-[13px]" /> : s.n}
              </span>
              <span
                className={`truncate text-label-sm ${
                  s.n === step ? 'text-on-surface' : 'text-outline'
                }`}
              >
                {s.title}
              </span>
              {s.n === 1 && <span className={`h-px flex-1 ${step > 1 ? 'bg-tertiary/50' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* ------------------------------------------------------ step one */}
        {step === 1 ? (
          <Card className="space-y-4 p-card-padding">
            <Field label="Full Name" placeholder="David Johnson" icon="person" autoComplete="name" />
            <Field label="Email Address" placeholder="you@email.com" icon="mail" type="email" autoComplete="email" />
            <Field label="Phone Number" placeholder="+234 800 000 0000" icon="call" type="tel" autoComplete="tel" />

            <label className="block">
              <span className="mb-2 block text-label-sm text-on-surface-variant">Country</span>
              <span className="surface flex items-center gap-3 rounded-xl px-4 py-3">
                <Icon name="public" className="text-[20px] text-outline" />
                <select className="w-full bg-transparent text-body-md text-on-surface outline-none [&>option]:bg-surface-container">
                  <option>Nigeria</option>
                  <option>Kenya</option>
                  <option>Ghana</option>
                  <option>South Africa</option>
                  <option>United Kingdom</option>
                  <option>United States</option>
                </select>
              </span>
            </label>

            <Button full size="lg" trailingIcon="arrow_forward" onClick={() => setStep(2)}>
              Continue
            </Button>
          </Card>
        ) : (
          /* ---------------------------------------------------- step two */
          <Card className="space-y-4 p-card-padding">
            <Field label="Password" placeholder="••••••••" icon="lock" type="password" autoComplete="new-password" />
            <Field
              label="Confirm Password"
              placeholder="••••••••"
              icon="lock_reset"
              type="password"
              autoComplete="new-password"
            />
            <Field label="Referral Code (optional)" placeholder="WRS-XXXX-0000" icon="group_add" />

            {/* single-line consent row */}
            <button
              onClick={() => setAgree(!agree)}
              className="flex w-full items-center gap-2.5 text-left"
            >
              <span
                className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded border transition-colors ${
                  agree ? 'border-primary bg-primary-container' : 'border-outline'
                }`}
              >
                {agree && <Icon name="check" className="text-[13px] text-white" />}
              </span>
              <span className="truncate text-label-sm text-on-surface-variant">
                I agree to the <span className="text-primary">Terms</span> &amp;{' '}
                <span className="text-primary">Privacy Policy</span>
              </span>
            </button>

            <Button full size="lg" disabled={!agree} onClick={() => nav('/verify')}>
              Create Account
            </Button>
          </Card>
        )}

        <div className="mt-4">
          <Disclosure icon="shield">
            Accounts require email verification, phone OTP, and identity verification where required by your region.
          </Disclosure>
        </div>

        <p className="mt-6 text-center text-label-sm text-outline">
          Already registered?{' '}
          <Link to="/login" className="text-primary hover:text-tertiary">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
