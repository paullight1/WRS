import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'

export default function AuthCallback() {
  const nav = useNavigate()
  const auth = useAuth()
  const handled = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (handled.current) return undefined
    handled.current = true
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
    fetch('/api/auth/confirm', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessToken, refreshToken }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.message || 'Unable to confirm your email.')
        return body
      })
      .then(async () => {
        if (!active) return
        await auth.refresh()
        nav('/onboarding', { replace: true })
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to confirm your email.')
      })
    return () => {
      active = false
    }
  }, [auth, nav])

  return (
    <div className="grid min-h-screen place-items-center px-margin-page text-center">
      <div className="max-w-md">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          {error ? 'Confirmation link unavailable' : 'Confirming your email…'}
        </h1>
        {error && <p className="mt-3 text-body-md text-error">{error}</p>}
        {error && (
          <button type="button" className="mt-6 text-primary underline" onClick={() => nav('/register')}>
            Back to registration
          </button>
        )}
      </div>
    </div>
  )
}
