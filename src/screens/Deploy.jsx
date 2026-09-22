import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import Worksite3D from '../components/robot3d/Worksite3D.jsx'
import {
  ACCENTS,
  Badge,
  Button,
  Card,
  Field,
  Icon,
  Progress,
  SectionTitle,
  Toast,
  tone,
  IconTile,
} from '../components/ui.jsx'
import { contribution, industries, robot, user, activeDeployments, deploymentHistory } from '../data/mock.js'
import { worksiteFor } from '../data/worksites.js'
import { getMiningCycleState, isMiningAreaUnlocked } from '../lib/miningCycle.js'

const STARTER_INDUSTRY = 'Logistics & Warehousing'
const PUBLIC_SITE_URL = 'https://worldroboticsystem.com'
const SELECTED_AREA_KEY = 'wrs-mining-selected-area'
const MINING_STARTED_AT_KEY = 'wrs-mining-started-at'
const LAST_CLAIMED_KEY = 'wrs-mining-last-claimed-at'

const STATUS_TONE = {
  Active: 'success',
  Paused: 'gold',
  Completed: 'tertiary',
  'Ended early': 'outline',
}

/* Metric strip shared by active + history cards. */
function Metrics({ items }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/8 py-3.5">
      {items.map(([k, v, cls = 'text-on-surface']) => (
        <div key={k} className="text-center">
          <p className="text-[11px] text-outline">{k}</p>
          <p className={`text-title font-bold ${cls}`}>{v}</p>
        </div>
      ))}
    </div>
  )
}

function DeploymentCard({ d, history = false, startedAt = null }) {
  return (
    <Card
      as={history ? 'div' : Link}
      to={history ? undefined : `/deploy/active/${d.id}`}
      className={`relative overflow-hidden p-4 ${d.status === 'Active' ? 'border-success/25 bg-success/[.04]' : ''}`}
    >
      <div className="relative flex items-start gap-3.5">
        <RobotFace tier={d.tier} size={56} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-title font-semibold text-on-surface">{d.title}</h3>
            <Badge t={STATUS_TONE[d.status] || 'tertiary'}>
              {d.status === 'Active' && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              {d.status}
            </Badge>
          </div>
          <p className="truncate text-label-sm text-outline">{d.industry}</p>
          <p className="mt-1.5 text-label-sm text-on-surface-variant">
            {history
              ? d.period
              : `Since: ${startedAt ? new Date(startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : d.since}`}
          </p>
        </div>
      </div>

      {history && (
        <Metrics
          items={[
            ['Hours Worked', d.hours],
            ['Tasks Completed', d.tasks],
            ['Performance', `${d.performance}%`, 'text-success'],
          ]}
        />
      )}

      {history && (
        <div className="mb-4 mt-3 flex items-center justify-between rounded-xl bg-primary/[.06] px-3.5 py-3">
          <span className="text-label-sm text-outline">Mining rate</span>
          <span className="font-data text-data-sm text-primary">1 RoboCoin / 24 h</span>
        </div>
      )}

      {history && (
        <Button to={`/deploy/active/${d.id}`} full variant="ghost" className="mt-3">
          View Details
        </Button>
      )}
    </Card>
  )
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function MiningCycleCard({ cycle, onClaim }) {
  const ready = cycle.status === 'ready'
  return (
    <Card className="border-primary/30 bg-primary/[.08] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-[.14em] text-primary">Daily mining cycle</p>
          <h2 className="mt-1 text-headline-md text-on-surface">
            {ready ? 'Your RoboCoin is ready' : 'Mining is in progress'}
          </h2>
          <p className="mt-2 max-w-[42ch] text-body-sm text-on-surface-variant">
            Return once every 24 hours to claim 1 RoboCoin. The reward is generated when you check in, not in the
            background.
          </p>
        </div>
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-center">
          <span className="font-headline-md text-primary">+1</span>
          <span className="text-[10px] text-primary">ROBO</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div>
          <p className="text-label-sm text-outline">{ready ? 'Available now' : 'Next claim in'}</p>
          <p className="font-data text-data-lg text-on-surface">
            {ready ? '1 RoboCoin' : formatCountdown(cycle.remainingMs)}
          </p>
        </div>
        <Button size="md" onClick={onClaim} disabled={!ready} icon={ready ? 'bolt' : 'schedule'}>
          {ready ? 'Generate RoboCoin' : 'Come back tomorrow'}
        </Button>
      </div>
    </Card>
  )
}

function ReferralCard() {
  const [copied, setCopied] = useState(false)
  const referralLink = `${PUBLIC_SITE_URL}/register?ref=${user.referralCode}`

  const shareReferral = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join World Robotic System',
          text: 'Start your robot journey with me.',
          url: referralLink,
        })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(referralLink)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card className="border-secondary/25 bg-secondary/[.07] p-5">
      <div className="flex items-start gap-3">
        <IconTile icon="group_add" accent="#b58cff" size={46} radius={12} iconSize={22} />
        <div className="min-w-0 flex-1">
          <p className="text-label-sm uppercase tracking-[.14em] text-secondary">Grow the network</p>
          <h2 className="mt-1 text-title text-on-surface">Share your referral link</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">Invite another builder to the robot economy.</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-data text-data-sm text-outline">{referralLink}</span>
        <Button size="sm" variant="ghost" onClick={shareReferral} icon={copied ? 'check' : 'content_copy'}>
          {copied ? 'Copied' : 'Share'}
        </Button>
      </div>
    </Card>
  )
}

export default function Deploy() {
  const [tab, setTab] = useState('Active')
  const [q, setQ] = useState('')
  const [lockedAreaNotice, setLockedAreaNotice] = useState('')
  const [selectedArea, setSelectedArea] = useState(() => window.localStorage.getItem(SELECTED_AREA_KEY))
  const [miningStartedAt, setMiningStartedAt] = useState(() => {
    const value = Number(window.localStorage.getItem(MINING_STARTED_AT_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  })
  const [lastClaimedAt, setLastClaimedAt] = useState(() => {
    const value = Number(window.localStorage.getItem(LAST_CLAIMED_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  })
  const [now, setNow] = useState(() => Date.now())
  const list = industries.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
  const starter = industries.find((industry) => industry.name === STARTER_INDUSTRY) || industries[0]
  const cycle = useMemo(() => getMiningCycleState(lastClaimedAt, now), [lastClaimedAt, now])
  const live = activeDeployments.find((d) => d.id === 'warehouse-assistant') || activeDeployments[0]

  useEffect(() => {
    if (!selectedArea || cycle.status === 'ready') return undefined
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [selectedArea, cycle.status])

  useEffect(() => {
    if (!selectedArea || miningStartedAt) return
    const startedAt = Date.now()
    setMiningStartedAt(startedAt)
    window.localStorage.setItem(MINING_STARTED_AT_KEY, String(startedAt))
  }, [selectedArea, miningStartedAt])

  const chooseStarter = () => {
    const startedAt = Date.now()
    setSelectedArea(starter.name)
    setMiningStartedAt(startedAt)
    window.localStorage.setItem(SELECTED_AREA_KEY, starter.name)
    window.localStorage.setItem(MINING_STARTED_AT_KEY, String(startedAt))
    setTab('Active')
  }

  const claimRoboCoin = () => {
    if (cycle.status !== 'ready') return
    const claimedAt = Date.now()
    setLastClaimedAt(claimedAt)
    setNow(claimedAt)
    window.localStorage.setItem(LAST_CLAIMED_KEY, String(claimedAt))
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <AppShell title="Mining" subtitle={`${robot.name} · Daily RoboCoin cycle`}>
        {/* ------------------------------------------------------- area tabs */}
        <div className="surface sticky top-[68px] z-30 flex gap-1 rounded-2xl p-1">
          {['Available', 'Active', 'History'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-label-md transition-all ${
                tab === t
                  ? 'border border-primary/60 bg-primary-container/25 text-primary shadow-[0_0_18px_rgba(45,91,255,.25)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* --------------------------------------------------------- available */}
        {tab === 'Available' && (
          <>
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Icon name="rocket_launch" className="text-[20px] text-tertiary" />
                <span className="text-label-sm text-tertiary">Deployment Console</span>
              </div>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
                Choose where your robot can work
              </h2>
              <p className="mt-2 text-body-md text-on-surface-variant">
                Select an industry sector to assign your {robot.name} unit for active operation.
              </p>
            </section>

            <Field placeholder="Search industries…" icon="search" value={q} onChange={(e) => setQ(e.target.value)} />

            {/* One live stage rather than nine: it follows the search, so typing
              "farm" shows the robot in a field before you commit to the sector. */}
            {list.length > 0 && (
              <Card className="relative block overflow-hidden border-primary/25 bg-primary/[.06] p-0">
                <Worksite3D industry={starter.name} height={196} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-label-sm text-white/80">{worksiteFor(starter.name).task}</p>
                    <p className="truncate text-title text-white">Warehouse Assistant</p>
                  </div>
                </div>
              </Card>
            )}

            <section>
              <SectionTitle action={`${list.length} sectors`}>Available sectors</SectionTitle>
              <div className="space-y-2">
                {list.map((s) => {
                  const c = tone(s.tone)
                  const open = s.name === starter.name && isMiningAreaUnlocked(0)
                  const content = (
                    <div
                      className={`surface group flex items-center justify-between gap-4 rounded-2xl p-4 transition-all ${open ? 'hover:border-tertiary/40' : 'opacity-75'}`}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <IconTile
                          icon={open ? s.icon : 'lock'}
                          accent={open ? c.accent : ACCENTS.amber}
                          size={56}
                          radius={12}
                          iconSize={26}
                        />
                        <div className="min-w-0">
                          <h3 className="truncate text-title text-on-surface group-hover:text-tertiary">{s.name}</h3>
                          <p className="truncate text-label-sm text-outline">{s.desc}</p>
                          <p className="text-label-sm text-on-surface-variant">Demand: {s.demand}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {open ? (
                          <Badge t="tertiary">
                            <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> Available
                          </Badge>
                        ) : (
                          <Badge t="gold">
                            <Icon name="lock" className="text-[13px]" /> Pending
                          </Badge>
                        )}
                        <Icon
                          name="chevron_right"
                          className="text-outline transition-transform group-hover:translate-x-1"
                        />
                      </div>
                    </div>
                  )
                  return open ? (
                    <Link key={s.name} to={`/deploy/${encodeURIComponent(s.name)}`}>
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={s.name}
                      type="button"
                      className="block w-full text-left"
                      onClick={() => {
                        setLockedAreaNotice(`${s.name} is coming soon — keep mining in Warehouse Assistant.`)
                        window.setTimeout(() => setLockedAreaNotice(''), 2600)
                      }}
                    >
                      {content}
                    </button>
                  )
                })}
                {!list.length && (
                  <Card className="p-8 text-center">
                    <Icon name="search_off" className="text-[30px] text-outline" />
                    <p className="mt-2 text-body-md text-outline">No sector matches "{q}".</p>
                  </Card>
                )}
              </div>
            </section>
          </>
        )}

        {/* ------------------------------------------------------------ active */}
        {tab === 'Active' && (
          <>
            {/* The contract that is running right now, on its worksite. One stage
              per tab on purpose: a WebGL context per card is more than a
              mid-range phone should be asked to hold open while scrolling. */}
            {!selectedArea && (
              <Card className="border-primary/30 bg-primary/[.08] p-5">
                <p className="text-label-sm uppercase tracking-[.14em] text-primary">First visit</p>
                <h2 className="mt-1 text-headline-md text-on-surface">Choose your starting area</h2>
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Start with Warehouse Assistant. It is the only area unlocked for this account; the rest are pending.
                </p>
                <Button className="mt-4" full onClick={chooseStarter} icon="rocket_launch">
                  Start Warehouse Assistant
                </Button>
              </Card>
            )}

            {selectedArea && live && (
              <Card
                as={Link}
                to={`/deploy/active/${live.id}`}
                className="relative block overflow-hidden p-0 active:scale-[.99]"
              >
                <Worksite3D
                  industry={live.industry}
                  height={196}
                  label={`${live.title} — ${worksiteFor(live.industry).task}`}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-label-sm text-white/80">{worksiteFor(live.industry).task}</p>
                    <p className="truncate text-title text-white">{live.title}</p>
                  </div>
                  <Badge t="success">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" /> On site
                  </Badge>
                </div>
              </Card>
            )}

            {selectedArea && (
              <>
                <section className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'RoboCoin balance', value: user.roboCoinBalance, icon: 'paid', tone: 'primary' },
                    { label: 'Day streak', value: contribution.streak, icon: 'local_fire_department', tone: 'gold' },
                    { label: 'Referrals', value: user.referrals, icon: 'group_add', tone: 'secondary' },
                  ].map((s) => {
                    const c = tone(s.tone)
                    return (
                      <Card key={s.label} className="p-3.5 text-center">
                        <Icon name={s.icon} className={`${c.text} text-[20px]`} fill />
                        <p className="mt-1 font-headline-md text-headline-md text-on-surface">{s.value}</p>
                        <p className="text-[11px] leading-tight text-outline">{s.label}</p>
                      </Card>
                    )
                  })}
                </section>

                <section className="space-y-3">
                  {activeDeployments
                    .filter((d) => d.id === 'warehouse-assistant')
                    .map((d) => (
                      <DeploymentCard key={d.id} d={d} startedAt={miningStartedAt} />
                    ))}
                </section>

                <MiningCycleCard cycle={cycle} onClaim={claimRoboCoin} />
                <ReferralCard />

                <Button variant="ghost" full size="lg" icon="add" onClick={() => setTab('Available')}>
                  View pending areas
                </Button>
              </>
            )}
          </>
        )}

        {/* ----------------------------------------------------------- history */}
        {tab === 'History' && (
          <>
            <section>
              <SectionTitle action={`${deploymentHistory.length} records`}>Past deployments</SectionTitle>
              <div className="space-y-3">
                {deploymentHistory.map((d) => (
                  <DeploymentCard key={d.id} d={d} history />
                ))}
              </div>
            </section>
          </>
        )}

        <Toast show={!!lockedAreaNotice} message={lockedAreaNotice} icon="lock" />
      </AppShell>
    </div>
  )
}
