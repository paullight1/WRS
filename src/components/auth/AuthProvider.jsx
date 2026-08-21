import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authorizeSession } from '../../domain/auth/policy.ts'
import { browserAuthClient } from '../../infrastructure/auth/browserAuthClient.ts'
import { runtimeConfig } from '../../lib/runtimeConfig.js'

const AuthContext = createContext(null)

const demoSession = {
  id: 'demo-session',
  userId: 'demo-user',
  status: 'active',
  emailVerified: true,
  phoneVerified: true,
  mfaEnabled: false,
  mfaSatisfiedAt: null,
  kycStatus: 'verified',
  roles: ['user'],
  expiresAt: '2099-01-01T00:00:00.000Z',
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => (runtimeConfig.isDemo ? demoSession : null))
  const [loading, setLoading] = useState(() => !runtimeConfig.isDemo)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (runtimeConfig.isDemo) return demoSession
    if (!runtimeConfig.services.identity) {
      setSession(null)
      setError('Authoritative identity service is unavailable.')
      setLoading(false)
      return null
    }
    try {
      const result = await browserAuthClient.session()
      setSession(result.session)
      setError('')
      return result.session
    } catch {
      setSession(null)
      setError('Unable to verify your session.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!runtimeConfig.isDemo) void refresh()
  }, [refresh])

  const api = useMemo(
    () => ({
      session,
      loading,
      error,
      isDemo: runtimeConfig.isDemo,
      oauthEnabled: !runtimeConfig.isDemo && runtimeConfig.services.identity,
      refresh,
      async login(identifier, password, rememberMe) {
        if (runtimeConfig.isDemo) {
          setSession(demoSession)
          return demoSession
        }
        const result = await browserAuthClient.login(identifier, password, rememberMe)
        setSession(result.session)
        return result.session
      },
      async register(input) {
        if (runtimeConfig.isDemo) {
          return {
            userId: 'demo-user',
            challenges: [
              { id: 'demo-email', kind: 'email' },
              { id: 'demo-phone', kind: 'phone' },
            ],
          }
        }
        return browserAuthClient.register(input)
      },
      async verifyAccount(userId, challengeId, kind, code) {
        if (runtimeConfig.isDemo) {
          if (!/^\d{6}$/.test(code)) throw new Error('Enter a six-digit code.')
          setSession(demoSession)
          return demoSession
        }
        const result = await browserAuthClient.verify(userId, challengeId, kind, code)
        setSession(result.session)
        return result.session
      },
      resendVerification(userId, kind) {
        if (runtimeConfig.isDemo) return Promise.resolve({ challengeId: `demo-${kind}` })
        return browserAuthClient.resendVerification(userId, kind)
      },
      async logout() {
        if (!runtimeConfig.isDemo) await browserAuthClient.logout()
        setSession(null)
      },
      requestPasswordReset(identifier) {
        if (runtimeConfig.isDemo) return Promise.resolve({ message: 'Demo recovery request recorded.' })
        return browserAuthClient.requestPasswordReset(identifier)
      },
      resetPassword(token, password) {
        if (runtimeConfig.isDemo) return Promise.resolve({ ok: true })
        return browserAuthClient.resetPassword(token, password)
      },
      async beginOAuth(provider) {
        const result = await browserAuthClient.beginOAuth(provider)
        window.location.assign(result.authorizationUrl)
      },
      enrollMfa() {
        if (runtimeConfig.isDemo) {
          return Promise.resolve({ enrollmentId: 'demo-mfa', provisioningUri: 'otpauth://totp/WRS:demo?secret=DEMOONLY', recoveryCodes: ['DEMO-RECOVERY'] })
        }
        return browserAuthClient.enrollMfa()
      },
      async verifyMfa(enrollmentId, code) {
        if (runtimeConfig.isDemo) {
          const next = { ...demoSession, mfaEnabled: true, mfaSatisfiedAt: new Date().toISOString() }
          setSession(next)
          return next
        }
        const result = await browserAuthClient.verifyMfa(enrollmentId, code)
        setSession(result.session)
        return result.session
      },
      async disableMfa(code) {
        if (runtimeConfig.isDemo) {
          const next = { ...demoSession, mfaEnabled: false, mfaSatisfiedAt: null }
          setSession(next)
          return next
        }
        await browserAuthClient.disableMfa(code)
        return refresh()
      },
    }),
    [error, loading, refresh, session],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}

export function ProtectedRoute({ children, policy = 'authenticated', requireVerified = false }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.loading) return <div className="grid min-h-screen place-items-center text-on-surface-variant">Verifying session…</div>
  const effectivePolicy = requireVerified ? 'verified' : policy
  const decision = authorizeSession(auth.session, effectivePolicy)
  if (decision.allowed) return children
  if (decision.reason === 'unverified') return <Navigate to="/verify" replace state={{ from: location.pathname }} />
  if (decision.reason === 'kyc-required') return <Navigate to="/settings" replace state={{ reason: 'kyc-required' }} />
  if (decision.reason === 'forbidden') return <Navigate to="/home" replace />
  return <Navigate to="/login" replace state={{ from: location.pathname }} />
}
