import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import { Button, Field, Icon } from '../components/ui.jsx'
import { passwordIssues } from '../domain/auth/validation.ts'

function hashRecoveryToken() {
  if (typeof window === 'undefined') return ''
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return hash.get('access_token') || ''
}

export default function ResetPassword() {
  const auth = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') || hashRecoveryToken(), [params])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const issues = passwordIssues(password)
    if (!token) return setError('This reset link is missing or has expired.')
    if (issues.length) return setError(`Password must contain ${issues.join(', ')}.`)
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    try {
      await auth.resetPassword(token, password)
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      }
      nav('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset link is invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout maxWidth="max-w-md">
      <section className="space-y-5 rounded-[28px] border border-[#e4dced] bg-white p-5 shadow-[0_18px_55px_rgba(45,25,74,.10)] sm:p-7">
        <h1 className="font-headline-md text-[24px] font-bold text-[#261a38]">Set a new password</h1>
        <Field
          label="New password"
          type={showPasswords ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          appearance="light"
          trailing={<PasswordVisibility show={showPasswords} onToggle={() => setShowPasswords((show) => !show)} />}
        />
        <Field
          label="Confirm password"
          type={showPasswords ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          appearance="light"
          trailing={<PasswordVisibility show={showPasswords} onToggle={() => setShowPasswords((show) => !show)} />}
        />
        {error && (
          <p role="alert" className="text-label-md font-semibold text-[#b12c4a]">
            {error}
          </p>
        )}
        <Button full loading={loading} onClick={submit} disabled={!token} style={{ backgroundColor: '#6336aa' }}>
          Update password
        </Button>
      </section>
    </AuthLayout>
  )
}

function PasswordVisibility({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Hide password' : 'Show password'}
      aria-pressed={show}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#6a5588] hover:bg-[#f3eef9] hover:text-[#49247d]"
    >
      <Icon name={show ? 'visibility_off' : 'visibility'} className="text-[23px]" />
    </button>
  )
}
