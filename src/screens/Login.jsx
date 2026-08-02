import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Atmosphere } from '../components/AppShell.jsx'
import { Button, Field, Icon, Card } from '../components/ui.jsx'

function SocialButton({ label, children }) {
  return (
    <button
      aria-label={label}
      className="surface grid h-12 w-12 place-items-center rounded-full transition-all hover:border-white/25 active:scale-95"
    >
      {children}
    </button>
  )
}

export default function Login() {
  const nav = useNavigate()
  const [remember, setRemember] = useState(true)

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

        <Card className="space-y-4 p-card-padding">
          <Field placeholder="Email or Phone Number" icon="alternate_email" type="text" />
          <Field placeholder="Password" icon="lock" type="password" />

          <div className="flex items-center justify-between">
            <button
              onClick={() => setRemember(!remember)}
              className="flex items-center gap-2 text-label-sm text-on-surface-variant"
            >
              <span
                className={`grid h-4 w-4 place-items-center rounded border transition-colors ${
                  remember ? 'border-primary bg-primary-container' : 'border-outline'
                }`}
              >
                {remember && <Icon name="check" className="text-[12px] text-white" />}
              </span>
              Remember me
            </button>
            <Link to="/login" className="text-label-sm text-primary hover:text-tertiary">
              Forgot Password?
            </Link>
          </div>

          <Button full size="lg" onClick={() => nav('/home')}>
            Login
          </Button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-label-sm text-outline">or login with</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex justify-center gap-4">
            <SocialButton label="Google">
              <span className="text-title font-bold text-on-surface">G</span>
            </SocialButton>
            <SocialButton label="Apple">
              <Icon name="phone_iphone" className="text-on-surface" />
            </SocialButton>
            <SocialButton label="Facebook">
              <span className="text-title font-bold text-primary">f</span>
            </SocialButton>
          </div>
        </Card>

        <Button to="/register" variant="ghost" full size="lg" className="mt-4">
          Create New Account
        </Button>
      </div>
    </div>
  )
}
