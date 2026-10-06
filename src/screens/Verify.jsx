import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import { Button } from '../components/ui.jsx'

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
    <AuthLayout maxWidth="max-w-md">
      <div>
        <h1 className="font-headline-lg-mobile text-[27px] font-bold leading-tight text-[#261a38]">Check your email</h1>
        <p className="mb-6 mt-2 text-[16px] font-medium leading-6 text-[#665c74]">
          We sent a confirmation link to your email address. Open it to activate your WRS account. Phone verification is
          not required.
        </p>
        <section className="space-y-5 rounded-[28px] border border-[#e4dced] bg-white p-5 shadow-[0_18px_55px_rgba(45,25,74,.10)] sm:p-7">
          <label className="block text-title font-semibold text-[#312445]" htmlFor="confirmation-email">
            Email address
          </label>
          <input
            id="confirmation-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            className="h-14 w-full rounded-xl border border-[#ded5eb] bg-white px-4 text-[18px] font-semibold text-[#211a2d] outline-none placeholder:font-medium placeholder:text-[#857a94] focus:border-[#6941b5] focus:ring-4 focus:ring-[#6941b5]/10"
          />
          {message && (
            <p role="status" className="text-label-md font-semibold text-[#24825e]">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="text-label-md font-semibold text-[#b12c4a]">
              {error}
            </p>
          )}
          <Button full size="lg" loading={loading} onClick={resend} style={{ backgroundColor: '#6336aa' }}>
            Resend confirmation email
          </Button>
          <Button
            full
            onClick={() => nav('/login')}
            className="border border-[#ded5eb] bg-white text-[#56338d] hover:bg-[#f8f5fd]"
          >
            Go to login
          </Button>
          <p className="text-label-md font-medium leading-5 text-[#655b74]">
            Only the confirmation link sent to this email can activate your account.
          </p>
        </section>
      </div>
    </AuthLayout>
  )
}
