import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, Icon, IconTile, List, Row, SectionTitle } from '../../components/ui.jsx'
import StateView, { LoadingView } from '../../components/states/StateView.jsx'
import { activityStatus, miningApi } from '../../lib/miningApi.js'

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const color = (icon) => ({ mic: '#8b2fd6', image: '#128b57', verified: '#2f6bff', bolt: '#d9660f', confirmation_number: '#b07d00' })[icon] || '#0f8fa0'
const timestamp = (value) => value ? new Date(value).toLocaleString() : 'Time unavailable'
const activityList = (data) => Array.isArray(data) ? data : data?.activities || data?.items || []

export default function Activity() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => { setError(''); try { setItems(activityList(await miningApi.getActivity())) } catch (requestError) { setError(requestError.message) } }, [])
  useEffect(() => { load() }, [load])
  if (!items && !error) return <LoadingView title="Loading reward activity" desc="Reading your traceable contribution records." />
  if (!items) return <StateView live kind="error" title="Activity unavailable" desc={error} action={<Button icon="refresh" onClick={load}>Try again</Button>} />

  return <div className="space-y-5">
    <section className="rounded-3xl border border-primary/30 bg-[linear-gradient(135deg,rgba(47,107,255,.17),rgba(18,22,31,.96)_58%)] p-5 sm:p-7"><p className="flex items-center gap-2 text-label-md uppercase tracking-[.14em] text-primary"><Icon name="history" fill /> Reward history</p><h2 className="mt-2 font-headline-lg text-headline-lg text-on-surface">Every reward has a source.</h2><p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">Pending, approved, rejected, and claimed states are shown exactly as the server records them.</p></section>
    {error ? <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error"><span>{error}</span><button onClick={load} className="text-label-md underline">Retry</button></div> : null}
    <section><SectionTitle action={`${items.length} records`}>Mining activity</SectionTitle>{items.length ? <List>{items.map((item) => { const status = activityStatus(item.status); const reward = Number(item.rewardRbc || 0); return <Row key={item.id} iconNode={<IconTile icon={item.icon || 'receipt_long'} accent={color(item.icon)} size={42} radius={12} />} title={item.title || 'Contribution record'} subtitle={`${item.detail || 'No additional detail'} · ${timestamp(item.createdAt)}`} value={`${reward >= 0 ? '+' : ''}${money(reward)} RBC`} meta={<Badge t={status.tone}>{status.label}</Badge>}><span className="mt-1 block truncate text-label-sm text-on-surface-variant">Source: {item.sourceId || 'Not available'}</span></Row> })}</List> : <Card><StateView kind="empty" title="No reward records yet" desc="When WRS verifies a contribution, its source and status will appear here." action={<Button to="/mining/missions">View missions</Button>} /></Card>}</section>
  </div>
}
