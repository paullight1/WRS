import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { Atmosphere } from '../components/AppShell.jsx'
import { Button, Card, Field, Icon } from '../components/ui.jsx'

function SocialButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="surface grid h-12 min-w-12 place-items-center rounded-full px-3 transition-all hover:border-white/25 active:scale-95"
    >
      {children}
    </button>
  )
}

export default function Login() {
  const nav = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!identifier.trim() || !password) return setError('Enter your email/phone and password.')
    setLoading(true)
    setError('')
    try {
      const result = await auth.login(identifier, password, remember)
      if (!result.session.emailVerified || !result.session.phoneVerified) {
        nav('/verify', {
          replace: true,
          state: {
            from: location.state?.from || '/home',
            userId: result.session.userId,
            challenges: result.challenges,
          },
        })
        return
      }
      nav(location.state?.from || '/home', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-margin-page py-12">
      <Atmosphere />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <Icon name="language" className="text-[30px] text-primary" fill />
          </span>
          <h1 className="font-headline-lg text-[26px] font-extrabold uppercase tracking-tight text-on-surface">
            World Robotic <span className="text-primary">System</span>
          </h1>
          <p className="mt-3 text-body-md text-on-surface-variant">Login to your account</p>
        </div>

        <Card as="form" onSubmit={submit} className="space-y-4 p-card-padding">
          <Field
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email or Phone Number"
            icon="alternate_email"
            type="text"
            autoComplete="username"
          />
          <Field
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            icon="lock"
            type="password"
            autoComplete="current-password"
          />
          {error && (
            <p role="alert" className="text-label-sm text-error">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setRemember(!remember)}
              className="flex items-center gap-2 text-label-sm text-on-surface-variant"
            >
              <span
                className={`grid h-4 w-4 place-items-center rounded border transition-colors ${remember ? 'border-primary bg-primary-container' : 'border-outline'}`}
              >
                {remember && <Icon name="check" className="text-[12px] text-white" />}
              </span>
              Remember me
            </button>
            <Link to="/forgot-password" className="text-label-sm text-primary hover:text-tertiary">
              Forgot Password?
            </Link>
          </div>

          <Button full size="lg" type="submit" loading={loading}>
            Login
          </Button>

          {auth.oauthEnabled && (
            <>
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-label-sm text-outline">or login with</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <div className="flex justify-center gap-4">
                <SocialButton label="Continue with Google" onClick={() => auth.beginOAuth('google')}>
                  <span className="text-title font-bold text-on-surface">G</span>
                </SocialButton>
                <SocialButton label="Continue with Apple" onClick={() => auth.beginOAuth('apple')}>
                  <Icon name="phone_iphone" className="text-on-surface" />
                </SocialButton>
              </div>
            </>
          )}
        </Card>

        <Button to="/register" variant="ghost" full size="lg" className="mt-4">
          Create New Account
        </Button>
      </div>
    </div>
  )
}
