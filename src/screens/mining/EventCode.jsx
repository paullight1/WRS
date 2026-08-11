import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, Field, Icon, List, Row, SectionTitle } from '../../components/ui.jsx'
import StateView, { LoadingView } from '../../components/states/StateView.jsx'
import { miningApi, normalizeEventCode } from '../../lib/miningApi.js'

const eventsFrom = (data) => Array.isArray(data) ? data : data?.events || data?.items || []
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function EventCode() {
  const [events, setEvents] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => { setError(''); try { setEvents(eventsFrom(await miningApi.getEventCodes())) } catch (requestError) { setError(requestError.message) } }, [])
  useEffect(() => { load() }, [load])
  const redeem = async (event) => { event.preventDefault(); setReceipt(null); setError(''); let normalized; try { normalized = normalizeEventCode(code) } catch (validationError) { setError(validationError.message); return } setBusy(true); try { setReceipt(await miningApi.redeemEventCode(normalized)); setCode(''); await load() } catch (requestError) { setError(requestError.message) } finally { setBusy(false) } }

  if (!events && !error) return <LoadingView title="Loading event rewards" desc="Checking active WRS events and your redemption history." />
  if (!events) return <StateView live kind="error" title="Event codes unavailable" desc={error} action={<Button icon="refresh" onClick={load}>Try again</Button>} />

  return <div className="space-y-5">
    <section className="rounded-3xl border border-[#f3b91f]/30 bg-[radial-gradient(circle_at_84%_18%,rgba(243,185,31,.18),transparent_28%),linear-gradient(135deg,#302512,#11161e_62%)] p-5 sm:p-7"><p className="flex items-center gap-2 text-label-md uppercase tracking-[.14em] text-[#f7c948]"><Icon name="confirmation_number" fill /> Event code</p><h2 className="mt-2 font-headline-lg text-headline-lg text-on-surface">Turn attendance into verified rewards.</h2><p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">Use the single-use code shared at an eligible WRS event. Codes can expire and cannot be guessed or reused.</p></section>
    <Card className="p-5"><form onSubmit={redeem}><Field id="mining-event-code" label="Event code" icon="confirmation_number" value={code} onChange={(event) => setCode(event.target.value)} placeholder="WRS847219" autoComplete="one-time-code" error={error} /><Button full className="mt-4" loading={busy} disabled={!code.trim()} icon="redeem">Redeem code</Button></form>{receipt ? <div role="status" className="mt-4 rounded-xl border border-success/30 bg-success/10 p-4"><p className="text-title text-success">Reward claimed</p><p className="mt-1 text-body-sm text-on-surface-variant">{money(receipt.rewardRbc)} RBC · {Number(receipt.xp || 0).toLocaleString()} XP · {Number(receipt.miningPower || 0).toLocaleString()} MP</p></div> : null}</Card>
    <section><SectionTitle>Eligible events</SectionTitle>{events.length ? <List>{events.map((event) => <Row key={event.id || event.code} icon="event" t="gold" title={event.title || 'WRS event'} subtitle={event.detail || `Expires ${event.expiresAt ? new Date(event.expiresAt).toLocaleString() : 'when event closes'}`} value={event.rewardRbc !== undefined ? `+${money(event.rewardRbc)} RBC` : undefined} meta={event.claimed ? <Badge t="success">Claimed</Badge> : event.active === false ? <Badge t="outline">Closed</Badge> : <Badge t="gold">Active</Badge>} />)}</List> : <Card><StateView kind="empty" title="No eligible events right now" desc="Event codes are only shared during WRS meetings, sessions, and community events." action={<Button to="/community">Find community events</Button>} /></Card>}</section>
  </div>
}
