import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'

export default function AdminVerification() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const userId = auth.session?.userId || location.state?.userId || ''
  const sessionUserId = auth.session?.userId
  const authLoading = auth.loading
  const startVerification = auth.startVerification
  const [challenges, setChallenges] = useState(() =>
    Array.isArray(location.state?.challenges) ? location.state.challenges : [],
  )
  const [challengeId, setChallengeId] = useState(challenges[0]?.id || '')
  const [loadingChallenges, setLoadingChallenges] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const verificationRequest = useRef(null)
  const challenge = challenges.find((item) => item.id === challengeId)

  useEffect(() => {
    if (authLoading) return
    if (!sessionUserId) {
      navigate('/login', { replace: true, state: { from: location.state?.from || '/' } })
      return
    }
    if (challenges.length) return
    // Reuse the request across StrictMode's setup/cleanup replay so verification
    // codes are requested once and the active subscriber still gets the result.
    if (!verificationRequest.current || verificationRequest.current.userId !== sessionUserId) {
      verificationRequest.current = {
        userId: sessionUserId,
        promise: Promise.resolve().then(() => startVerification()),
      }
    }
    const request = verificationRequest.current.promise
    let active = true
    Promise.resolve()
      .then(() => {
        if (active) {
          setLoadingChallenges(true)
          setError('')
        }
        return request
      })
      .then((result) => {
        if (!active) return
        const available = Array.isArray(result?.challenges) ? result.challenges : []
        setLoadingChallenges(false)
        setChallenges(available)
        setChallengeId(available[0]?.id || '')
        if (!available.length) setError('No verification methods are available for this account. Contact WRS support.')
      })
      .catch((reason) => {
        if (!active) return
        setLoadingChallenges(false)
        setError(reason instanceof Error ? reason.message : 'Could not load verification methods.')
      })
    return () => {
      active = false
    }
  }, [authLoading, sessionUserId, startVerification, challenges.length, location.state?.from, navigate, retryCount])

  async function submit(event) {
    event.preventDefault()
    if (!userId || !challenge) return setError('Sign in again to request an operator verification code.')
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await auth.verifyAccount(userId, challenge.id, challenge.kind, code.trim())
      navigate(location.state?.from || '/', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Verification failed.')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (!userId || !challenge) return setError('Sign in again to request an operator verification code.')
    setBusy(true)
    setError('')
    try {
      const result = await auth.resendVerification(userId, challenge.kind, challenge.id)
      if (result?.challenge?.id) {
        setChallenges((current) =>
          current.map((item) => (item.kind === result.challenge.kind ? result.challenge : item)),
        )
        setChallengeId(result.challenge.id)
        setCode('')
      }
      setMessage('A new verification code has been sent.')
    } catch (reason) {
      if (reason?.code === 'invalid-challenge') {
        try {
          const result = await auth.startVerification()
          const available = Array.isArray(result?.challenges) ? result.challenges : []
          setChallenges(available)
          setChallengeId(available.find((item) => item.kind === challenge.kind)?.id || available[0]?.id || '')
          setCode('')
          setMessage('Your previous verification challenge expired. A fresh code has been requested.')
          if (!available.length)
            setError('No verification methods are available for this account. Contact WRS support.')
        } catch (refreshError) {
          setError(
            refreshError instanceof Error ? refreshError.message : 'Unable to refresh the verification challenge.',
          )
        }
      } else {
        setError(reason instanceof Error ? reason.message : 'Unable to resend the code.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-labelledby="admin-verification-title">
        <span className="admin-eyebrow">WRS ADMIN CONSOLE</span>
        <h1 id="admin-verification-title">Verify your account</h1>
        <p className="admin-auth-intro">Complete the verification challenge for your existing WRS account.</p>
        {loadingChallenges && <p role="status">Loading verification methods…</p>}
        {challenges.length > 0 && (
          <label className="admin-field-label" htmlFor="admin-challenge">
            Verification method
          </label>
        )}
        {challenges.length > 0 && (
          <select id="admin-challenge" value={challengeId} onChange={(event) => setChallengeId(event.target.value)}>
            {challenges.map((item) => (
              <option key={item.id} value={item.id}>
                {item.kind}
              </option>
            ))}
          </select>
        )}
        <form className="admin-auth-form" onSubmit={submit}>
          <label htmlFor="admin-code">Verification code</label>
          <input
            id="admin-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
          {error && (
            <p className="admin-form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="admin-form-success" role="status">
              {message}
            </p>
          )}
          <button className="admin-primary-button" type="submit" disabled={busy || !userId || !challenge}>
            {busy ? 'Verifying…' : 'Verify account'}
          </button>
        </form>
        <button className="admin-secondary-button" type="button" disabled={busy || !challenge} onClick={resend}>
          Resend code
        </button>
        {error && challenges.length === 0 && auth.session && (
          <button
            className="admin-secondary-button"
            type="button"
            disabled={loadingChallenges}
            onClick={() => {
              verificationRequest.current = null
              setError('')
              setChallenges([])
              setRetryCount((count) => count + 1)
            }}
          >
            Retry verification setup
          </button>
        )}
        <Link className="admin-auth-help" to="/login">
          Back to operator sign in
        </Link>
      </section>
    </main>
  )
}
