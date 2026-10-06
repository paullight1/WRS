import AdminHint from './AdminHint.jsx'

const TARGET = 200_000_000n

function decimal(atomic, scale) {
  const divisor = 10n ** BigInt(scale)
  const whole = (atomic / divisor).toLocaleString('en-US')
  const fraction = (atomic % divisor).toString().padStart(scale, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}

export default function SupplyProgress({ issuance, loading, onOpen }) {
  const scale = issuance?.atomicScale
  const ready = issuance?.status === 'ready' && Number.isInteger(scale) && scale >= 0 && scale <= 12 && /^\d+$/.test(String(issuance.totalIssuedAtomic))
  const issued = ready ? BigInt(issuance.totalIssuedAtomic) : 0n
  const target = ready ? TARGET * 10n ** BigInt(scale) : 0n
  const remaining = target > issued ? target - issued : 0n
  const percent = ready ? Number(issued * 100000000n / target) / 1000000 : 0
  const configured = ready && /^\d+$/.test(String(issuance.globalIssuanceCapAtomic)) ? BigInt(issuance.globalIssuanceCapAtomic) : null
  return <section className="admin-supply" aria-label="RoboCoin supply">
    <div className="admin-supply-heading"><div><div className="admin-supply-title"><h2>RoboCoin supply</h2><AdminHint label="What counts as issued RBC?">Confirmed mining awards and activity rewards count toward this total. Unclaimed mining is excluded. The progress bar compares issued coins with your 200 million RBC target.</AdminHint></div></div><button type="button" onClick={onOpen}>Manage <span aria-hidden="true">↗</span></button></div>
    <div className="admin-supply-total"><strong>{ready ? decimal(issued, scale) : loading ? 'Loading…' : 'Unavailable'}</strong><span>RBC issued <span className="admin-supply-target">of 200,000,000 RBC</span></span></div>
    <div className="admin-supply-track" role="progressbar" aria-label="RBC issued toward 200 million supply" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready ? Math.min(percent, 100) : undefined} aria-valuetext={ready ? `${decimal(issued, scale)} of 200,000,000 RBC issued` : 'Supply data unavailable'}><span style={{ width: `${Math.min(percent, 100)}%` }} /></div>
    <div className="admin-supply-meta"><span>{ready ? `${percent.toLocaleString('en-US', { maximumFractionDigits: 6 })}% issued` : 'Awaiting authoritative totals'}</span><span>{ready ? `${decimal(remaining, scale)} RBC remaining` : '200 million RBC supply target'}</span></div>
    {ready && configured !== target && <div className="admin-supply-warning"><span>Cap mismatch: {configured === null ? 'not configured' : `${decimal(configured, scale)} RBC`} configured</span><AdminHint label="Supply cap mismatch">Your target is 200 million RBC. The server enforces its configured cap shown here. Open Manage to review the reward policy; this dashboard does not change issuance limits.</AdminHint></div>}
  </section>
}
