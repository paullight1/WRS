import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Atmosphere } from '../components/AppShell.jsx'
import { Button, Card, Icon, Disclosure } from '../components/ui.jsx'

const steps = [
  { icon: 'mail', title: 'Email verification', desc: 'Link sent to you@email.com', state: 'done' },
  { icon: 'sms', title: 'Phone OTP', desc: 'Enter the 6-digit code we sent', state: 'active' },
  { icon: 'badge', title: 'Identity verification', desc: 'Required for withdrawals', state: 'todo' },
]

export default function Verify() {
  const nav = useNavigate()
  const [code, setCode] = useState(['', '', '', '', '', ''])

  const setDigit = (i, v) => {
    const next = [...code]
    next[i] = v.replace(/\D/g, '').slice(-1)
    setCode(next)
    if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus()
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-margin-page py-12">
      <Atmosphere />
      <div className="w-full max-w-sm">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Verify your account</h1>
        <p className="mb-6 mt-2 text-body-md text-on-surface-variant">
          Three quick checks keep the WRS network trustworthy.
        </p>

        <Card className="space-y-5 p-card-padding">
          <div className="flex justify-between gap-2">
            {code.map((d, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                inputMode="numeric"
                className="h-14 w-full rounded-xl border border-white/10 bg-black/30 text-center font-label-md text-[20px] text-on-surface outline-none transition-all focus:border-tertiary focus:shadow-[0_0_15px_rgba(0,219,231,.25)]"
              />
            ))}
          </div>
          <p className="text-center text-label-sm font-label-sm text-outline">
            Didn't get it? <span className="text-primary">Resend in 0:42</span>
          </p>
          <Button full size="lg" onClick={() => nav('/onboarding')}>
            Verify & Continue
          </Button>
        </Card>

        <div className="mt-5 space-y-2">
          {steps.map((s) => (
            <div key={s.title} className="glass flex items-center gap-3 rounded-2xl p-3.5">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl border ${
                  s.state === 'done'
                    ? 'border-tertiary/30 bg-tertiary/10 text-tertiary'
                    : s.state === 'active'
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-white/10 bg-white/5 text-outline'
                }`}
              >
                <Icon name={s.state === 'done' ? 'check' : s.icon} className="text-[20px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-md text-on-surface">{s.title}</p>
                <p className="text-label-sm font-label-sm text-outline">{s.desc}</p>
              </div>
              {s.state === 'done' && <Icon name="verified" className="text-tertiary" fill />}
            </div>
          ))}
        </div>

        <div className="mt-5">
          <Disclosure>Verification data is stored securely and can be deleted from Settings → Privacy.</Disclosure>
        </div>
      </div>
    </div>
  )
}
