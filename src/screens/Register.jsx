import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import { Button, Field, Icon } from '../components/ui.jsx'
import { validateRegistration } from '../domain/auth/validation.ts'

const TERMS_VERSION = '2026-08-21'
const PRIVACY_VERSION = '2026-08-21'

function referralCodeFrom(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw, window.location.origin)
    const code = url.searchParams.get('referralCode') || url.searchParams.get('ref')
    if (code) return code.trim().toUpperCase()
    return raw.toUpperCase()
  } catch {
    return raw.toUpperCase()
  }
}

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
    label: 'Have a referral invite?',
    fieldLabel: 'Referral link or code (optional)',
    description: 'Paste a friend’s WRS invite link or enter their referral code.',
    placeholder: 'https://worldroboticsystem.com/register?referralCode=…',
    icon: 'group_add',
  },
]

export default function Register() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const auth = useAuth()
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    referralCode: referralCodeFrom(
      searchParams.get('referralCode') || searchParams.get('ref') || searchParams.get('referral'),
    ),
    termsAccepted: false,
    privacyAccepted: true,
  })
  const [error, setError] = useState('')
  const [registrationConflict, setRegistrationConflict] = useState(false)
  const [loading, setLoading] = useState(false)
  const set = (key) => (event) => {
    setForm((value) => ({ ...value, [key]: event.target.value }))
    setError('')
    setRegistrationConflict(false)
  }

  const continueStep = () => {
    const current = questionSteps[step - 1]
    const value = form[current.key]
    if (current.key === 'fullName' && value.trim().length < 2) return setError('Enter your full name.')
    if (current.key === 'email' && !value.trim()) return setError('Enter your email address.')
    if (current.key === 'password' && value.length < 12) return setError('Use at least 12 characters.')
    if (current.key === 'passwordConfirmation' && value !== form.password) return setError('Passwords must match.')
    if (current.key === 'referralCode' && value.trim() && !referralCodeFrom(value)) {
      return setError('Paste a valid WRS referral link or code.')
    }
    setError('')
    setStep((value) => value + 1)
  }

  const submit = async () => {
    const registrationForm = form
    const input = {
      ...registrationForm,
      referralCode: referralCodeFrom(registrationForm.referralCode),
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    }
    const checked = validateRegistration(input)
    if (!checked.valid) return setError(checked.issues[0]?.message || 'Check your details.')
    setLoading(true)
    setError('')
    setRegistrationConflict(false)
    try {
      const result = await auth.register(input)
      nav('/verify', { state: { email: result.email } })
    } catch (err) {
      if (err?.code === 'registration-conflict') {
        setRegistrationConflict(true)
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div>
        <button
          type="button"
          onClick={() => (step === 1 ? nav('/') : setStep((value) => value - 1))}
          className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-label-md font-bold text-[#6841ac] transition-colors hover:bg-[#eee7f7]"
        >
          <Icon name="arrow_back" className="text-[20px]" />
          Back
        </button>
        <h1 className="font-headline-lg-mobile text-[27px] font-bold leading-tight tracking-[-.035em] text-[#261a38]">
          Create your WRS account
        </h1>
        <p className="mt-2 text-[16px] font-medium leading-6 text-[#665c74]">
          One step at a time. You can review everything before creating your account.
        </p>
        <div className="mt-8 flex items-center gap-3" aria-label={`Step ${step} of ${questionSteps.length + 1}`}>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e8e1ef]">
            <div
              className="h-full rounded-full bg-[#7045b5] transition-[width] duration-200"
              style={{ width: `${(step / (questionSteps.length + 1)) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-label-md font-bold text-[#6d43a8]">
            {step} / {questionSteps.length + 1}
          </span>
        </div>

        {step <= questionSteps.length ? (
          <div className="mt-8 rounded-[26px] border border-[#e4dced] bg-white p-5 shadow-[0_16px_45px_rgba(45,25,74,.08)] sm:p-7">
            {(() => {
              const current = questionSteps[step - 1]
              return (
                <div key={current.key}>
                  <h2 className="font-headline-md text-[22px] font-bold leading-tight text-[#2c203d]">
                    {current.label}
                  </h2>
                  <p className="mt-2 text-[16px] font-medium leading-6 text-[#665c74]">{current.description}</p>
                  <div className="mt-8">
                    <Field
                      label={current.fieldLabel}
                      value={form[current.key]}
                      onChange={set(current.key)}
                      placeholder={current.placeholder}
                      icon={current.icon}
                      appearance="light"
                      type={current.type === 'password' && showPassword ? 'text' : current.type}
                      autoComplete={current.autoComplete}
                      trailing={
                        current.type === 'password' ? (
                          <button
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#6a5588] hover:bg-[#f3eef9] hover:text-[#49247d]"
                          >
                            <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[23px]" />
                          </button>
                        ) : undefined
                      }
                    />
                  </div>
                </div>
              )
            })()}
            {error && (
              <p role="alert" className="mt-4 text-label-md font-semibold text-[#b12c4a]">
                {error}
              </p>
            )}
            <Button
              full
              size="lg"
              trailingIcon="arrow_forward"
              onClick={continueStep}
              className="mt-5 min-h-[58px] rounded-2xl text-[17px] font-bold"
              style={{ backgroundColor: '#6336aa' }}
            >
              Continue
            </Button>
          </div>
        ) : (
          <div className="mt-8 rounded-[26px] border border-[#e4dced] bg-white p-5 shadow-[0_16px_45px_rgba(45,25,74,.08)] sm:p-7">
            <h2 className="font-headline-md text-[22px] font-bold leading-tight text-[#2c203d]">
              Ready to create your account?
            </h2>
            <p className="mt-2 text-[16px] font-medium leading-6 text-[#665c74]">
              Review the terms below, then continue to verification.
            </p>
            <div className="mt-8 space-y-4">
              <label className="flex items-start gap-3 text-[15px] font-semibold leading-6 text-[#51475f]">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={(e) => setForm((v) => ({ ...v, termsAccepted: e.target.checked }))}
                  className="mt-1 h-5 w-5 accent-[#6336aa]"
                />
                <span>I accept the Terms of Service version {TERMS_VERSION}.</span>
              </label>
            </div>
            {registrationConflict ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[#d9c9ee] bg-[#f8f5fd] p-4 text-left"
              >
                <h3 className="text-[16px] font-bold text-[#34224c]">This email already has an account</h3>
                <p className="mt-1 text-[14px] font-medium leading-5 text-[#665c74]">
                  Sign in with this email or reset your password to get back into your account.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/login"
                    state={{ email: form.email }}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6336aa] px-4 text-[15px] font-bold text-white transition-colors hover:bg-[#51298f]"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/forgot-password"
                    state={{ email: form.email }}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d9c9ee] bg-white px-4 text-[15px] font-bold text-[#56338d] transition-colors hover:bg-[#f3eef9]"
                  >
                    Reset password
                  </Link>
                </div>
              </div>
            ) : error ? (
              <p role="alert" className="mt-4 text-label-md font-semibold text-[#b12c4a]">
                {error}
              </p>
            ) : null}
            {!registrationConflict && (
              <Button
                full
                size="lg"
                loading={loading}
                onClick={submit}
                className="mt-6 min-h-[58px] rounded-2xl text-[17px] font-bold"
                style={{ backgroundColor: '#6336aa' }}
              >
                Create Account
              </Button>
            )}
          </div>
        )}
        <p className="mt-6 text-center text-[15px] font-semibold text-[#5e536e]">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-bold text-[#6336aa] underline decoration-[#bba7dc] underline-offset-4 hover:text-[#46227f]"
          >
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
