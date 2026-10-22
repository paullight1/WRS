import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'

export default function AuthCallback() {
  const nav = useNavigate()
  const { refresh: refreshAuth } = useAuth()
  const confirmationRequest = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const providerError = params.get('error_description') || new URLSearchParams(window.location.search).get('error_description')
    if (providerError) {
      setError(providerError)
      return () => {
        active = false
      }
    }
    if (!accessToken || !refreshToken) {
      setError('This confirmation link is incomplete or expired. Request a new email and try again.')
      return () => {
        active = false
      }
    }
    let pending = confirmationRequest.current
    if (!pending || pending.accessToken !== accessToken) {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 30_000)
      const promise = fetch('/api/auth/confirm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const body = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(body?.message || 'Unable to confirm your email.')
          return body
        })
        .finally(() => window.clearTimeout(timeout))
      pending = { accessToken, promise }
      confirmationRequest.current = pending
    }

    pending.promise
      .then(async () => {
        if (!active) return
        const session = await refreshAuth()
        if (!active) return
        if (!session) throw new Error('Your email is confirmed, but we could not sign you in. Please sign in.')
        nav('/onboarding', { replace: true })
      })
      .catch((reason) => {
        if (!active) return
        const message =
          reason instanceof Error && reason.name === 'AbortError'
            ? 'Confirmation is taking longer than expected. Please try again or request a new confirmation email.'
            : reason instanceof Error
              ? reason.message
              : 'Unable to confirm your email.'
        setError(message)
      })
    return () => {
      active = false
    }
  }, [refreshAuth, nav])

  return (
    <div className="grid min-h-screen place-items-center px-margin-page text-center">
      <div className="max-w-md">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          {error ? 'Confirmation link unavailable' : 'Confirming your email…'}
        </h1>
        {error && <p className="mt-3 text-body-md text-error">{error}</p>}
        {error && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <button type="button" className="text-primary underline" onClick={() => nav('/verify')}>
              Request a new confirmation email
            </button>
            <button type="button" className="text-primary underline" onClick={() => nav('/login')}>
              Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
