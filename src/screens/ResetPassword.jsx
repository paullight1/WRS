import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { Button, Card, Field } from '../components/ui.jsx'
import { passwordIssues } from '../domain/auth/validation.ts'

export default function ResetPassword() {
  const auth = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const token = params.get('token') || ''
    const issues = passwordIssues(password)
    if (!token) return setError('This reset link is missing its one-time token.')
    if (issues.length) return setError(`Password must contain ${issues.join(', ')}.`)
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    try {
      await auth.resetPassword(token, password)
      nav('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset link is invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-margin-page py-12">
      <Card className="w-full max-w-sm space-y-4 p-card-padding">
        <h1 className="font-headline-md text-headline-md text-on-surface">Set a new password</h1>
        <Field label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <Field label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        {error && <p role="alert" className="text-label-sm text-error">{error}</p>}
        <Button full loading={loading} onClick={submit}>Update password</Button>
      </Card>
    </div>
  )
}
