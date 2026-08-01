import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle, Toast } from '../components/ui.jsx'

export default function EventCode() {
  const [left, setLeft] = useState(465)
  const [code, setCode] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const mmss = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`

  const submit = () => {
    setToast(left === 0 ? 'This code has expired' : 'Code accepted — rewards applied')
    setTimeout(() => setToast(''), 2400)
  }

  return (
    <AppShell title="Enter Event Code" back avatar={false}>
      <section>
        <Card className="p-card-padding text-center">
          <p className="text-body-md text-on-surface-variant">
            Enter the temporary code shared during an official WRS meeting, event, campaign, or community activity.
          </p>

          <div className="my-7">
            <p className="text-label-sm font-label-sm uppercase tracking-widest text-outline">Code expires in</p>
            <p className={`font-headline-lg text-[40px] font-bold ${left < 60 ? 'text-error' : 'text-tertiary'}`}>
              {mmss}
            </p>
          </div>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WRS-000000"
            className="w-full rounded-xl border border-outline-variant bg-black/30 px-4 py-4 text-center font-label-md text-[20px] tracking-[0.2em] text-on-surface outline-none transition-all placeholder:text-outline/40 focus:border-tertiary focus:shadow-[0_0_18px_rgba(0,219,231,.25)]"
          />

          <Button full size="lg" className="mt-4" onClick={submit} disabled={left === 0}>
            Submit Code
          </Button>
        </Card>
      </section>

      <section>
        <SectionTitle>You will earn</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['bolt', 'XP', '+100 XP'],
            ['stars', 'Points', '+100 pts'],
            ['rocket_launch', 'Robot boost', 'Speed +5% / 24h'],
            ['military_tech', 'Badge progress', 'Event Regular 3/5'],
            ['event_available', 'Participation record', 'Logged to passport'],
          ].map(([icon, k, v]) => (
            <div key={k} className="flex items-center gap-3 px-5 py-3.5">
              <Icon name={icon} className="text-tertiary text-[20px]" fill />
              <span className="flex-1 text-body-md text-on-surface-variant">{k}</span>
              <span className="text-label-md font-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Security rules</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {[
            'Active 5–10 minutes',
            'One claim per verified account',
            'Device + account verification',
            'Duplicate claims blocked',
            'Invalid attempts monitored',
            'Admin-generated codes only',
          ].map((r) => (
            <Badge key={r} t="outline">
              {r}
            </Badge>
          ))}
        </div>
      </section>

      <Disclosure icon="shield">
        Event codes confirm attendance only. Repeated invalid attempts may temporarily lock code entry on your account.
      </Disclosure>

      <Toast show={!!toast} message={toast} t={left === 0 ? 'error' : 'tertiary'} />
    </AppShell>
  )
}
