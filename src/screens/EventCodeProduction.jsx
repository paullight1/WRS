import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, Card, Field } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'

export default function EventCodeProduction() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const redeem = async () => {
    setBusy(true)
    setMessage('')
    try {
      const result = await browserEcosystemClient.redeemEventCode(code)
      const points = Number(result.points || 0)
      setMessage(result.status === 'already-redeemed' ? 'This event was already claimed by your account.' : `Event claim verified${points ? ` · +${points} points` : ''}.`)
      setCode('')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Event code could not be redeemed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title="Event code" subtitle="Server-verified reward claims" back avatar={false}>
      <Card className="space-y-4 p-card-padding">
        <Field label="Event code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="WRS-…" autoComplete="off" />
        <Button full loading={busy} disabled={code.trim().length < 8} onClick={redeem}>Redeem code</Button>
        <p className="text-label-sm text-outline">Codes are hashed server-side, expire on the server, and can only award the event policy configured by WRS. Reloading this page cannot reset expiry or claim limits.</p>
      </Card>
      {message && <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">{message}</p>}
    </AppShell>
  )
}
