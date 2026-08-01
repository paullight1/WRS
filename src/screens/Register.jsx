import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Atmosphere } from '../components/AppShell.jsx'
import { Button, Card, Field, Icon, Disclosure } from '../components/ui.jsx'

export default function Register() {
  const nav = useNavigate()
  const [agree, setAgree] = useState(false)

  return (
    <div className="relative min-h-screen px-margin-page py-10">
      <Atmosphere />

      <div className="mx-auto w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-label-sm font-label-sm text-outline">
          <Icon name="arrow_back" className="text-[18px]" /> Back
        </Link>

        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Create your WRS account</h1>
        <p className="mb-6 mt-2 text-body-md text-on-surface-variant">
          One account for your robot, wallet, training and community.
        </p>

        <Card className="space-y-4 p-card-padding">
          <Field label="Full Name" placeholder="David Johnson" icon="person" />
          <Field label="Email Address" placeholder="you@email.com" icon="mail" type="email" />
          <Field label="Phone Number" placeholder="+234 800 000 0000" icon="call" type="tel" />

          <label className="block">
            <span className="mb-2 block text-label-sm font-label-sm text-on-surface-variant">Country</span>
            <span className="glass flex items-center gap-3 rounded-xl px-4 py-3">
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

          <Field label="Password" placeholder="••••••••" icon="lock" type="password" />
          <Field label="Confirm Password" placeholder="••••••••" icon="lock_reset" type="password" />
          <Field label="Referral Code (optional)" placeholder="WRS-XXXX-0000" icon="group_add" />

          <button
            onClick={() => setAgree(!agree)}
            className="flex w-full items-start gap-3 text-left text-label-sm font-label-sm leading-relaxed text-on-surface-variant"
          >
            <span
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                agree ? 'border-primary bg-primary-container' : 'border-outline'
              }`}
            >
              {agree && <Icon name="check" className="text-[12px] text-white" />}
            </span>
            I agree to the <span className="text-primary">Terms of Service</span> and{' '}
            <span className="text-primary">Privacy Policy</span>.
          </button>

          <Button full size="lg" disabled={!agree} onClick={() => nav('/verify')}>
            Create Account
          </Button>
        </Card>

        <div className="mt-4">
          <Disclosure icon="shield">
            Accounts require email verification, phone OTP, and identity verification where required by your region.
          </Disclosure>
        </div>

        <p className="mt-6 text-center text-label-sm font-label-sm text-outline">
          Already registered?{' '}
          <Link to="/login" className="text-primary hover:text-tertiary">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
