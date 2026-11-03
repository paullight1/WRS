import { useEffect, useRef, useState } from 'react'
import { atomicRateToDecimal } from '../../domain/mining/metrics.ts'
import { worksiteFor } from '../../data/worksites.js'
import { Badge, Button, Card, CoinMark } from '../ui.jsx'

function countdown(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`
}

export default function MiningCyclePanel({
  session,
  robotName,
  serverNow,
  onRefresh,
  refreshing = false,
  compact = false,
}) {
  const [now, setNow] = useState(() => Date.parse(serverNow) || Date.now())
  const settlementRefresh = useRef('')

  useEffect(() => {
    const offset = (Date.parse(serverNow) || Date.now()) - Date.now()
    const tick = () => setNow(Date.now() + offset)
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [serverNow])

  const endsAt = Date.parse(session?.endsAt)
  const startedAt = Date.parse(session?.startedAt)
  const remaining = Number.isFinite(endsAt) ? endsAt - now : 0
  const isRunning = session?.status === 'active' && remaining > 0
  const isPendingSettlement = session?.status === 'ended' || (session?.status === 'active' && remaining <= 0)
  const duration = endsAt - startedAt
  const progress =
    Number.isFinite(duration) && duration > 0 ? Math.max(0, Math.min(100, ((now - startedAt) / duration) * 100)) : 0
  const scale = Number(session?.rule?.atomicUnitScale ?? 0)
  const rate = atomicRateToDecimal(String(session?.rule?.rateAtomicPerHour || '0'), scale)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
  const worksite = worksiteFor(session?.worksiteId || 'logistics')

  useEffect(() => {
    if (!isPendingSettlement || settlementRefresh.current === session?.id) return
    settlementRefresh.current = session.id
    onRefresh?.()
  }, [isPendingSettlement, onRefresh, session?.id])

  if (!session) return null

  if (compact)
    return (
      <Card className="mt-4 space-y-3 border-white/10 bg-surface-container p-3" aria-label="Current mining cycle">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-label-sm text-on-surface-variant">
            <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-tertiary' : 'bg-[#f7c948]'}`} />
            {isRunning ? 'Mining in progress' : isPendingSettlement ? 'Settlement pending' : 'Cycle settled'}
          </span>
          <span className="tnum text-label-sm font-semibold text-on-surface">{rate} RBC / h</span>
        </div>
        <p className="tnum font-data text-2xl font-bold leading-tight text-on-surface">
          {isRunning ? countdown(remaining) : 'Cycle complete'}
          {isRunning && (
            <span className="ml-2 font-sans text-label-sm font-normal text-on-surface-variant">remaining</span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Mining cycle progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high"
          >
            <div className="h-full rounded-full bg-tertiary" style={{ width: `${progress}%` }} />
          </div>
          <span className="tnum text-label-sm text-on-surface-variant">{Math.round(progress)}%</span>
        </div>
        {isPendingSettlement && (
          <Button variant="tonal" size="sm" loading={refreshing} onClick={onRefresh}>
            Retry settlement
          </Button>
        )}
      </Card>
    )

  return (
    <Card className="overflow-hidden p-0" aria-label="Current mining cycle">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 bg-surface-container px-4 py-5 sm:px-5">
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-title font-semibold text-on-surface">{worksite.name}</p>
          <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">{worksite.task}</p>
        </div>
        <Badge t={isRunning ? 'tertiary' : isPendingSettlement ? 'gold' : 'outline'}>
          {isRunning ? 'Working' : isPendingSettlement ? 'Cycle ended' : 'Complete'}
        </Badge>
      </div>
      <div className="p-4 sm:p-5">
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
              {isRunning
                ? countdown(remaining)
                : Number.isFinite(duration) && duration > 0
                  ? `${Math.round(duration / 3600000)} hours`
                  : 'Cycle complete'}
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
            aria-label="Mining cycle progress"
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

        {isPendingSettlement && (
          <Button variant="tonal" className="mt-4" loading={refreshing} onClick={onRefresh}>
            Retry settlement
          </Button>
        )}
      </div>
    </Card>
  )
}
