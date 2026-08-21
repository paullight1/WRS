import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { Button, Card, Disclosure, Field, Icon } from '../components/ui.jsx'
import { validateRegistration } from '../domain/auth/validation.ts'

const TERMS_VERSION = '2026-08-21'
const PRIVACY_VERSION = '2026-08-21'

export default function Register() {
  const nav = useNavigate()
  const auth = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', passwordConfirmation: '', referralCode: '', termsAccepted: false, privacyAccepted: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }))

  const continueDetails = () => {
    if (form.fullName.trim().length < 2 || !form.email.trim() || !form.phone.trim()) return setError('Enter your name, email and international phone number.')
    setError('')
    setStep(2)
  }

  const submit = async () => {
    const input = { ...form, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION }
    const checked = validateRegistration(input)
    if (!checked.valid) return setError(checked.issues[0]?.message || 'Check your details.')
    setLoading(true)
    setError('')
    try {
      const result = await auth.register(input)
      nav('/verify', { state: { userId: result.userId, challenges: result.challenges } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen px-margin-page py-10">
      <div className="mx-auto w-full max-w-sm">
        <button type="button" onClick={() => (step === 1 ? nav('/') : setStep(1))} className="mb-6 inline-flex items-center gap-2 text-label-sm text-outline transition-colors hover:text-on-surface">
          <Icon name="arrow_back" className="text-[18px]" />{step === 1 ? 'Back' : 'Your details'}
        </button>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Create your WRS account</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">{step === 1 ? 'How we reach you and verify your account.' : 'Use a strong password and confirm the legal notices.'}</p>

        {step === 1 ? (
          <Card className="mt-6 space-y-4 p-card-padding">
            <Field label="Full Name" value={form.fullName} onChange={set('fullName')} placeholder="David Johnson" icon="person" autoComplete="name" />
            <Field label="Email Address" value={form.email} onChange={set('email')} placeholder="you@email.com" icon="mail" type="email" autoComplete="email" />
            <Field label="Phone Number" value={form.phone} onChange={set('phone')} placeholder="+2348000000000" icon="call" type="tel" autoComplete="tel" />
            {error && <p role="alert" className="text-label-sm text-error">{error}</p>}
            <Button full size="lg" trailingIcon="arrow_forward" onClick={continueDetails}>Continue</Button>
          </Card>
        ) : (
          <Card className="mt-6 space-y-4 p-card-padding">
            <Field label="Password" value={form.password} onChange={set('password')} placeholder="12+ characters" icon="lock" type="password" autoComplete="new-password" />
            <Field label="Confirm Password" value={form.passwordConfirmation} onChange={set('passwordConfirmation')} placeholder="Repeat password" icon="lock_reset" type="password" autoComplete="new-password" />
            <Field label="Referral Code (optional)" value={form.referralCode} onChange={set('referralCode')} placeholder="WRS-XXXX-0000" icon="group_add" />
            <label className="flex items-start gap-3 text-label-sm text-on-surface-variant">
              <input type="checkbox" checked={form.termsAccepted} onChange={(e) => setForm((v) => ({ ...v, termsAccepted: e.target.checked }))} className="mt-0.5" />
              <span>I accept the Terms of Service version {TERMS_VERSION}.</span>
            </label>
            <label className="flex items-start gap-3 text-label-sm text-on-surface-variant">
              <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => setForm((v) => ({ ...v, privacyAccepted: e.target.checked }))} className="mt-0.5" />
              <span>I acknowledge the Privacy Notice version {PRIVACY_VERSION}.</span>
            </label>
            {error && <p role="alert" className="text-label-sm text-error">{error}</p>}
            <Button full size="lg" loading={loading} onClick={submit}>Create Account</Button>
          </Card>
        )}

        <div className="mt-4"><Disclosure icon="shield">Registration creates a pending account. Email/phone verification is required before protected WRS features unlock.</Disclosure></div>
        <p className="mt-6 text-center text-label-sm text-outline">Already registered? <Link to="/login" className="text-primary hover:text-tertiary">Login</Link></p>
      </div>
    </div>
  )
}
