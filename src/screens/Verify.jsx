import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Atmosphere } from '../components/AppShell.jsx'
import { Button, Card, Disclosure } from '../components/ui.jsx'

export default function Verify() {
  const nav = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resend = async () => {
    if (!email.trim()) return setError('Enter the email address you registered with.')
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await fetch('/api/auth/verification/resend-confirmation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const body = await result.json().catch(() => ({}))
      if (!result.ok) throw new Error(body?.message || 'Unable to resend the confirmation email.')
      setMessage(body.message || 'A new confirmation email has been sent.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to resend the confirmation email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-margin-page py-12">
      <Atmosphere />
      <div className="w-full max-w-sm">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Check your email</h1>
        <p className="mb-6 mt-2 text-body-md text-on-surface-variant">
          We sent a confirmation link to your email address. Open it to activate your WRS account. Phone verification
          is not required.
        </p>
        <Card className="space-y-5 p-card-padding">
          <label className="block text-label-sm text-on-surface-variant" htmlFor="confirmation-email">
            Email address
          </label>
          <input
            id="confirmation-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            className="h-14 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-body-md text-on-surface outline-none focus:border-tertiary"
          />
          {message && <p role="status" className="text-label-sm text-tertiary">{message}</p>}
          {error && <p role="alert" className="text-label-sm text-error">{error}</p>}
          <Button full size="lg" loading={loading} onClick={resend}>
            Resend confirmation email
          </Button>
          <Button full variant="ghost" onClick={() => nav('/login')}>
            Go to login
          </Button>
        </Card>
        <div className="mt-5">
          <Disclosure>Only Supabase’s confirmation link can activate your account.</Disclosure>
        </div>
      </div>
    </div>
  )
}
