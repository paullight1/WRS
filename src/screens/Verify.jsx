import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { Atmosphere } from '../components/AppShell.jsx'
import { Button, Card, Disclosure } from '../components/ui.jsx'

export default function Verify() {
  const nav = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const userId = location.state?.userId || auth.session?.userId || ''
  const challenge = useMemo(() => location.state?.challenges?.find((item) => item.kind === 'phone') || location.state?.challenges?.[0] || null, [location.state])

  const setDigit = (i, value) => {
    const next = [...code]
    next[i] = value.replace(/\D/g, '').slice(-1)
    setCode(next)
    if (value && i < 5) document.getElementById(`otp-${i + 1}`)?.focus()
  }

  const verify = async () => {
    const value = code.join('')
    if (value.length !== 6) return setError('Enter the complete six-digit code.')
    if (!userId || !challenge?.id) return setError('Verification challenge is missing. Start registration again.')
    setLoading(true)
    setError('')
    try {
      await auth.verifyAccount(userId, challenge.id, challenge.kind || 'phone', value)
      nav(location.state?.from || '/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!userId) return setError('Registration context is missing.')
    try {
      await auth.resendVerification(userId, challenge?.kind || 'phone')
      setError('A new verification code was requested. Previous codes are no longer authoritative.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend yet.')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-margin-page py-12">
      <Atmosphere />
      <div className="w-full max-w-sm">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Verify your account</h1>
        <p className="mb-6 mt-2 text-body-md text-on-surface-variant">Verification is challenge-backed and single-use.</p>
        <Card className="space-y-5 p-card-padding">
          <div className="flex justify-between gap-2">
            {code.map((digit, i) => (
              <input key={i} id={`otp-${i}`} value={digit} onChange={(e) => setDigit(i, e.target.value)} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Verification digit ${i + 1}`} className="h-14 w-full rounded-xl border border-white/10 bg-black/30 text-center font-data text-data-lg text-on-surface outline-none transition-all focus:border-tertiary" />
            ))}
          </div>
          {error && <p role="status" className="text-center text-label-sm text-on-surface-variant">{error}</p>}
          <Button full size="lg" loading={loading} onClick={verify}>Verify & Continue</Button>
          <Button full variant="ghost" onClick={resend}>Resend code</Button>
        </Card>
        <div className="mt-5"><Disclosure>Only the authoritative verification service can mark email or phone verified. A URL or client value cannot do so.</Disclosure></div>
      </div>
    </div>
  )
}
