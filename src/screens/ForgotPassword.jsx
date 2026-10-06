import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import { Button, Field } from '../components/ui.jsx'

export default function ForgotPassword() {
  const auth = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!identifier.trim()) return setMessage('Enter the email or phone associated with your account.')
    setLoading(true)
    try {
      await auth.requestPasswordReset(identifier)
      setMessage('If an account matches, recovery instructions have been sent.')
    } catch {
      setMessage('If an account matches, recovery instructions have been sent.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout maxWidth="max-w-md">
      <section className="space-y-5 rounded-[28px] border border-[#e4dced] bg-white p-5 shadow-[0_18px_55px_rgba(45,25,74,.10)] sm:p-7">
        <h1 className="font-headline-md text-[24px] font-bold text-[#261a38]">Recover your account</h1>
        <p className="text-[16px] font-medium leading-6 text-[#665c74]">
          For privacy, WRS gives the same response whether or not an account exists.
        </p>
        <Field
          label="Email or phone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          appearance="light"
        />
        {message && (
          <p role="status" className="text-label-md font-medium text-[#5f566c]">
            {message}
          </p>
        )}
        <Button full loading={loading} onClick={submit} style={{ backgroundColor: '#6336aa' }}>
          Send recovery instructions
        </Button>
        <Link to="/login" className="block text-center text-label-md font-bold text-[#6336aa]">
          Back to login
        </Link>
      </section>
    </AuthLayout>
  )
}
