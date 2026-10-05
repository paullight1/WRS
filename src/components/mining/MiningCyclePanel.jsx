import { useEffect, useState } from 'react'
import { atomicRateToDecimal } from '../../domain/mining/metrics.ts'
import { Badge, Button, Card, CoinMark, Icon } from '../ui.jsx'

function countdown(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`
}

export default function MiningCyclePanel({ session, robotName, serverNow, onRefresh, refreshing = false }) {
  const [now, setNow] = useState(() => Date.parse(serverNow) || Date.now())

  useEffect(() => {
    const offset = (Date.parse(serverNow) || Date.now()) - Date.now()
    const tick = () => setNow(Date.now() + offset)
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [serverNow])

  if (!session) return null

  const endsAt = Date.parse(session.endsAt)
  const startedAt = Date.parse(session.startedAt)
  const remaining = Number.isFinite(endsAt) ? endsAt - now : 0
  const isRunning = session.status === 'active' && remaining > 0
  const isPendingSettlement = session.status === 'ended' || (session.status === 'active' && remaining <= 0)
  const duration = endsAt - startedAt
  const progress =
    Number.isFinite(duration) && duration > 0 ? Math.max(0, Math.min(100, ((now - startedAt) / duration) * 100)) : 0
  const scale = Number(session.rule?.atomicUnitScale ?? 0)
  const rate = atomicRateToDecimal(String(session.rule?.rateAtomicPerHour || '0'), scale)

  return (
    <Card className="overflow-hidden p-4 sm:p-5" aria-label="Current mining cycle">
      <div className="flex items-start gap-3">
        <CoinMark size={46} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-title font-semibold text-on-surface">
              {isRunning ? 'Mining in progress' : 'Cycle complete'}
            </h2>
            <Badge t={isRunning ? 'tertiary' : isPendingSettlement ? 'gold' : 'outline'}>
              {isRunning ? 'Active' : isPendingSettlement ? 'Settlement pending' : 'Settled'}
            </Badge>
          </div>
          <p className="mt-1 text-body-sm text-on-surface-variant">{robotName || 'Your robot'}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-container px-3 py-3">
          <p className="text-label-sm text-on-surface-variant">Configured rate</p>
          <p className="tnum mt-1 text-title font-semibold text-on-surface">{rate} RBC per hour</p>
        </div>
        <div className="rounded-xl bg-surface-container px-3 py-3">
          <p className="text-label-sm text-on-surface-variant">{isRunning ? 'Time remaining' : 'Cycle duration'}</p>
          <p className="tnum mt-1 text-title font-semibold text-on-surface">
            {isRunning ? countdown(remaining) : '24 hours'}
          </p>
        </div>
      </div>

      <div className="mt-4" aria-label="Mining cycle progress">
        <div className="mb-2 flex items-center justify-between gap-3 text-label-sm text-on-surface-variant">
          <span>Cycle progress</span>
          <span className="tnum">{Math.round(progress)}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="24-hour mining cycle progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="h-2 overflow-hidden rounded-full bg-surface-container-high"
        >
          <div
            className="h-full rounded-full bg-tertiary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 text-body-sm text-on-surface-variant">
        <Icon name="verified_user" className="mt-0.5 text-tertiary" />
        <p>
          {isRunning
            ? 'The selected robot stays assigned for this 24-hour cycle. RoboCoin is credited after settlement.'
            : isPendingSettlement
              ? 'This cycle has ended. Its RoboCoin award is not available until the server settles it.'
              : 'The settled award is recorded in your RoboCoin balance.'}
        </p>
      </div>
      {isPendingSettlement && (
        <Button variant="secondary" className="mt-4" loading={refreshing} onClick={onRefresh}>
          Retry settlement
        </Button>
      )}
    </Card>
  )
}
