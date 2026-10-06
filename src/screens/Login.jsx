import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import { Button, Field, Icon } from '../components/ui.jsx'

function SocialButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-12 min-w-12 place-items-center rounded-full border border-[#ded5eb] bg-white px-3 text-[#312445] transition-all hover:border-[#a990d0] hover:bg-[#f8f5fd] active:scale-95"
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
  const [showPassword, setShowPassword] = useState(false)
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
      if (!result.session.emailVerified) {
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
      nav(location.state?.from || '/home', {
        replace: true,
        state: result.dailyReward?.status === 'awarded' ? { dailyXpAward: result.dailyReward.xp } : null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <h1 className="font-headline-lg-mobile text-[28px] font-bold leading-tight tracking-[-.035em] text-[#261a38]">
          Welcome back
        </h1>
        <p className="mt-2 text-[17px] font-medium text-[#665c74]">Log in to your WRS account</p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-5 rounded-[28px] border border-[#e4dced] bg-white p-5 shadow-[0_18px_55px_rgba(45,25,74,.10)] sm:p-7"
      >
        <Field
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Email or Phone Number"
          icon="alternate_email"
          type="text"
          autoComplete="username"
          appearance="light"
        />
        <Field
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          icon="lock"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          appearance="light"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#6a5588] hover:bg-[#f3eef9] hover:text-[#49247d]"
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[23px]" />
            </button>
          }
        />
        {error && (
          <p role="alert" className="text-label-md font-semibold text-[#b12c4a]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setRemember(!remember)}
            className="flex items-center gap-2 text-label-md font-semibold text-[#50465e]"
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-md border transition-colors ${remember ? 'border-[#6841ac] bg-[#6841ac]' : 'border-[#aea4bd] bg-white'}`}
            >
              {remember && <Icon name="check" className="text-[14px] text-white" />}
            </span>
            Remember me
          </button>
          <Link to="/forgot-password" className="text-label-md font-bold text-[#6239a2] hover:text-[#46227f]">
            Forgot Password?
          </Link>
        </div>

        <Button
          full
          size="lg"
          type="submit"
          loading={loading}
          className="min-h-[58px] rounded-2xl text-[17px] font-bold"
          style={{ backgroundColor: '#6336aa' }}
        >
          Login
        </Button>

        {auth.oauthEnabled && (
          <>
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-[#e8e1ef]" />
              <span className="text-label-md font-semibold text-[#756a83]">or log in with</span>
              <span className="h-px flex-1 bg-[#e8e1ef]" />
            </div>
            <div className="flex justify-center gap-4">
              <SocialButton label="Continue with Google" onClick={() => auth.beginOAuth('google')}>
                <span className="text-title font-bold text-[#312445]">G</span>
              </SocialButton>
              <SocialButton label="Continue with Apple" onClick={() => auth.beginOAuth('apple')}>
                <Icon name="phone_iphone" className="text-[#312445]" />
              </SocialButton>
            </div>
          </>
        )}
      </form>

      <p className="mt-6 text-center text-[16px] font-semibold text-[#5e536e]">
        New to WRS?{' '}
        <Link to="/register" className="font-bold text-[#6336aa] underline decoration-[#bba7dc] underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
