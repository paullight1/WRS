import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { Button, Field, Icon } from '../components/ui.jsx'
import { validateRegistration } from '../domain/auth/validation.ts'

const TERMS_VERSION = '2026-08-21'
const PRIVACY_VERSION = '2026-08-21'

const questionSteps = [
  {
    key: 'fullName',
    label: 'What should we call you?',
    fieldLabel: 'Full name',
    description: 'Use your full name so your account is easy to verify.',
    placeholder: 'David Johnson',
    icon: 'person',
    autoComplete: 'name',
  },
  {
    key: 'email',
    label: 'What is your email address?',
    fieldLabel: 'Email address',
    description: 'We will use it to confirm your account.',
    placeholder: 'you@email.com',
    icon: 'mail',
    type: 'email',
    autoComplete: 'email',
  },
  {
    key: 'password',
    label: 'Create a password.',
    fieldLabel: 'Password',
    description: 'Use at least 12 characters for better security.',
    placeholder: '12+ characters',
    icon: 'lock',
    type: 'password',
    autoComplete: 'new-password',
  },
  {
    key: 'passwordConfirmation',
    label: 'Confirm your password.',
    fieldLabel: 'Confirm password',
    description: 'Enter the same password again.',
    placeholder: 'Repeat password',
    icon: 'lock_reset',
    type: 'password',
    autoComplete: 'new-password',
  },
  {
    key: 'referralCode',
    label: 'Do you have a referral code?',
    fieldLabel: 'Referral code (optional)',
    description: 'This is optional. You can continue without one.',
    placeholder: 'WRS-XXXX-0000',
    icon: 'group_add',
  },
]

export default function Register() {
  const nav = useNavigate()
  const auth = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    referralCode: '',
    termsAccepted: false,
    privacyAccepted: true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }))

  const continueStep = () => {
    const current = questionSteps[step - 1]
    const value = form[current.key]
    if (current.key === 'fullName' && value.trim().length < 2) return setError('Enter your full name.')
    if (current.key === 'email' && !value.trim()) return setError('Enter your email address.')
    if (current.key === 'password' && value.length < 12) return setError('Use at least 12 characters.')
    if (current.key === 'passwordConfirmation' && value !== form.password) return setError('Passwords must match.')
    setError('')
    setStep((value) => value + 1)
  }

  const submit = async () => {
    const registrationForm = form
    const input = {
      ...registrationForm,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    }
    const checked = validateRegistration(input)
    if (!checked.valid) return setError(checked.issues[0]?.message || 'Check your details.')
    setLoading(true)
    setError('')
    try {
      const result = await auth.register(input)
      nav('/verify', { state: { email: result.email } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen px-margin-page py-10">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => (step === 1 ? nav('/') : setStep((value) => value - 1))}
          className="mb-6 inline-flex items-center gap-2 text-label-sm text-outline transition-colors hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Back
        </button>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Create your WRS account</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          One step at a time. You can review everything before creating your account.
        </p>
        <div className="mt-8 flex items-center gap-3" aria-label={`Step ${step} of ${questionSteps.length + 1}`}>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${(step / (questionSteps.length + 1)) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-label-sm text-outline">
            {step} / {questionSteps.length + 1}
          </span>
        </div>

        {step <= questionSteps.length ? (
          <div className="mt-14">
            {(() => {
              const current = questionSteps[step - 1]
              return (
                <div key={current.key}>
                  <h2 className="font-headline-md text-headline-md text-on-surface">{current.label}</h2>
                  <p className="mt-2 text-body-md text-on-surface-variant">{current.description}</p>
                  <div className="mt-8">
                    <Field
                      label={current.fieldLabel}
                      value={form[current.key]}
                      onChange={set(current.key)}
                      placeholder={current.placeholder}
                      icon={current.icon}
                      type={current.type}
                      autoComplete={current.autoComplete}
                    />
                  </div>
                </div>
              )
            })()}
            {error && (
              <p role="alert" className="mt-4 text-label-sm text-error">
                {error}
              </p>
            )}
            <Button full size="lg" trailingIcon="arrow_forward" onClick={continueStep} className="mt-8">
              Continue
            </Button>
          </div>
        ) : (
          <div className="mt-14">
            <h2 className="font-headline-md text-headline-md text-on-surface">Ready to create your account?</h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Review the terms below, then continue to verification.
            </p>
            <div className="mt-8 space-y-4">
              <label className="flex items-start gap-3 text-label-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={(e) => setForm((v) => ({ ...v, termsAccepted: e.target.checked }))}
                  className="mt-0.5"
                />
                <span>I accept the Terms of Service version {TERMS_VERSION}.</span>
              </label>
            </div>
            {error && (
              <p role="alert" className="mt-4 text-label-sm text-error">
                {error}
              </p>
            )}
            <Button full size="lg" loading={loading} onClick={submit} className="mt-8">
              Create Account
            </Button>
          </div>
        )}
        <p className="mt-6 text-center text-label-sm text-outline">
          Already registered?{' '}
          <Link
            to="/login"
            className="text-primary underline decoration-current underline-offset-2 hover:text-tertiary"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
