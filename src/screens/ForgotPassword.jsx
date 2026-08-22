import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { Button, Card, Field } from '../components/ui.jsx'

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
    <div className="grid min-h-screen place-items-center px-margin-page py-12">
      <Card className="w-full max-w-sm space-y-4 p-card-padding">
        <h1 className="font-headline-md text-headline-md text-on-surface">Recover your account</h1>
        <p className="text-body-sm text-on-surface-variant">
          For privacy, WRS gives the same response whether or not an account exists.
        </p>
        <Field
          label="Email or phone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
        />
        {message && (
          <p role="status" className="text-label-sm text-on-surface-variant">
            {message}
          </p>
        )}
        <Button full loading={loading} onClick={submit}>
          Send recovery instructions
        </Button>
        <Link to="/login" className="block text-center text-label-sm text-primary">
          Back to login
        </Link>
      </Card>
    </div>
  )
}
