import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { Atmosphere } from '../components/AppShell.jsx'
import { Button, Card, Disclosure } from '../components/ui.jsx'

function nextChallenge(session, challenges) {
  if (!session?.emailVerified) return challenges.find((item) => item.kind === 'email') || null
  if (!session?.phoneVerified) return challenges.find((item) => item.kind === 'phone') || null
  return null
}

export default function Verify() {
  const nav = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(() => location.state?.userId || auth.session?.userId || '')
  const [challenges, setChallenges] = useState(() => location.state?.challenges || [])
  const challenge = useMemo(() => nextChallenge(auth.session, challenges), [auth.session, challenges])

  useEffect(() => {
    if (challenge || auth.isDemo || !auth.session?.userId) return undefined
    if (auth.session.emailVerified && auth.session.phoneVerified) return undefined
    let active = true
    auth
      .startVerification()
      .then((result) => {
        if (!active) return
        setUserId(result.userId)
        setChallenges(result.challenges)
        setError('Fresh verification codes were requested for the checks that are still incomplete.')
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to start verification.')
      })
    return () => {
      active = false
    }
  }, [auth, challenge])

  useEffect(() => {
    if (auth.session?.emailVerified && auth.session?.phoneVerified) {
      queueMicrotask(() => nav(location.state?.from || '/onboarding', { replace: true }))
    }
  }, [auth.session?.emailVerified, auth.session?.phoneVerified, location.state?.from, nav])

  const setDigit = (i, value) => {
    const next = [...code]
    next[i] = value.replace(/\D/g, '').slice(-1)
    setCode(next)
    if (value && i < 5) document.getElementById(`otp-${i + 1}`)?.focus()
  }

  const verify = async () => {
    const value = code.join('')
    if (value.length !== 6) return setError('Enter the complete six-digit code.')
    if (!userId || !challenge?.id) return setError('Verification challenge is missing. Request a fresh code.')
    setLoading(true)
    setError('')
    try {
      const session = await auth.verifyAccount(userId, challenge.id, challenge.kind, value)
      setChallenges((current) => current.filter((item) => item.id !== challenge.id))
      setCode(['', '', '', '', '', ''])
      if (!session.emailVerified || !session.phoneVerified) {
        setError(`${challenge.kind === 'email' ? 'Email' : 'Phone'} verified. Complete the remaining check.`)
        return
      }
      nav(location.state?.from || '/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!userId || !challenge?.id) return setError('Verification context is missing.')
    try {
      const result = await auth.resendVerification(userId, challenge.kind, challenge.id)
      setChallenges((current) => [
        ...current.filter((item) => item.kind !== challenge.kind),
        result.challenge,
      ])
      setCode(['', '', '', '', '', ''])
      setError(`A new ${challenge.kind} verification code was requested. The previous code is no longer authoritative.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend yet.')
    }
  }

  const label = challenge?.kind === 'email' ? 'email' : challenge?.kind === 'phone' ? 'phone' : 'account'

  return (
    <div className="relative flex min-h-screen items-center justify-center px-margin-page py-12">
      <Atmosphere />
      <div className="w-full max-w-sm">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Verify your {label}</h1>
        <p className="mb-6 mt-2 text-body-md text-on-surface-variant">
          Email and phone are verified independently with single-use provider challenges.
        </p>
        <Card className="space-y-5 p-card-padding">
          <div className="flex justify-between gap-2">
            {code.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                value={digit}
                onChange={(e) => setDigit(i, e.target.value)}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Verification digit ${i + 1}`}
                className="h-14 w-full rounded-xl border border-white/10 bg-black/30 text-center font-data text-data-lg text-on-surface outline-none transition-all focus:border-tertiary"
              />
            ))}
          </div>
          {error && (
            <p role="status" className="text-center text-label-sm text-on-surface-variant">
              {error}
            </p>
          )}
          <Button full size="lg" loading={loading} disabled={!challenge} onClick={verify}>
            Verify & Continue
          </Button>
          <Button full variant="ghost" disabled={!challenge} onClick={resend}>
            Resend code
          </Button>
        </Card>
        <div className="mt-5">
          <Disclosure>
            Only the authoritative verification provider and server challenge can mark a factor verified. Client state or
            a URL cannot do so.
          </Disclosure>
        </div>
      </div>
    </div>
  )
}
