import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import WelcomeModal, { consumeWelcome } from '../components/WelcomeModal.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import StateView from '../components/states/StateView.jsx'
import { ACCENTS, Badge, Button, Card, Icon, IconTile, SectionTitle } from '../components/ui.jsx'
import { isActivityLocked } from '../lib/activityAvailability.js'
import { packageDefinition } from '../domain/robot/packages.ts'
import { leaderboard, user } from '../data/mock.js'

const CATALOGUE = [
  { id: 'training', to: '/training', icon: 'model_training', label: 'Train', c: ACCENTS.indigo },
  { id: 'data', to: '/data', icon: 'dataset', label: 'Add data', c: ACCENTS.teal },
  { id: 'deploy', to: '/deploy', icon: 'rocket_launch', label: 'Mining', c: ACCENTS.violet },
  { id: 'market', to: '/marketplace', icon: 'storefront', label: 'Market', c: ACCENTS.blue },
  { id: 'wallet', to: '/wallet', icon: 'account_balance_wallet', label: 'Wallet', c: ACCENTS.green },
  { id: 'rewards', to: '/rewards', icon: 'workspace_premium', label: 'Rewards', c: ACCENTS.amber },
  { id: 'academy', to: '/academy', icon: 'school', label: 'Academy', c: ACCENTS.pink },
  { id: 'community', to: '/community', icon: 'groups', label: 'Community', c: ACCENTS.orange },
  { id: 'passport', to: '/robot/passport', icon: 'badge', label: 'Passport', c: ACCENTS.slate },
  { id: 'customize', to: '/robot/customize', icon: 'tune', label: 'Customise', c: ACCENTS.violet },
  { id: 'packages', to: '/packages', icon: 'inventory_2', label: 'Packages', c: ACCENTS.blue },
  { id: 'support', to: '/support', icon: 'help_outline', label: 'Support', c: ACCENTS.slate },
]

const DEFAULT_IDS = ['deploy', 'wallet', 'passport', 'customize']
const MAX_SHORTCUTS = 12
const STORE_KEY = 'wrs.shortcuts'
const TASK_WINDOW_SECONDS = 4 * 60 * 60 + 32 * 60 + 18

function formatCountdown(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

const loadShortcuts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY))
    if (Array.isArray(saved) && saved.length) {
      return saved.filter((id) => CATALOGUE.some((item) => item.id === id))
    }
  } catch {
    // Use deterministic defaults when local preferences are unavailable.
  }
  return DEFAULT_IDS
}

export default function Home() {
  const robotState = useRobot()
  const [welcome, setWelcome] = useState(false)
  const [ids, setIds] = useState(loadShortcuts)
  const [editing, setEditing] = useState(false)
  const [countdown, setCountdown] = useState(TASK_WINDOW_SECONDS)

  useEffect(() => {
    queueMicrotask(() => {
      if (consumeWelcome()) setWelcome(true)
    })
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => (value > 0 ? value - 1 : TASK_WINDOW_SECONDS))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const persist = (next) => {
    setIds(next)
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next))
    } catch {
      // Shortcut preferences are non-authoritative UX state.
    }
  }

  const chosen = ids
    .filter((id) => !isActivityLocked(CATALOGUE.find((item) => item.id === id)?.to || ''))
    .map((id) => CATALOGUE.find((item) => item.id === id))
    .filter(Boolean)
  const available = CATALOGUE.filter((item) => !ids.includes(item.id) && !isActivityLocked(item.to))
  const full = ids.length >= MAX_SHORTCUTS

  return (
    <AppShell title={`Hi, ${user.firstName}`}>
      <WelcomeModal open={welcome} onClose={() => setWelcome(false)} />

      {robotState.loading ? (
        <StateView kind="loading" title="Loading your robot" desc="Reading the latest confirmed robot state." />
      ) : !robotState.robot ? (
        <StateView
          kind="locked"
          title={robotState.isDemo ? 'Create your robot' : 'Robot provisioning is not complete'}
          desc={robotState.error || 'Complete onboarding before robot identity and configuration can appear here.'}
          action={<Button to="/onboarding">Open onboarding</Button>}
        />
      ) : (
        <section>
          <Card accent={ACCENTS.indigo} className="overflow-hidden p-5">
            <div className="flex items-start gap-4">
              <Robot3D
                size={96}
                config={robotState.configuration || undefined}
                className="shrink-0"
                label={`${robotState.robot.name}, ${robotState.isDemo ? 'robot' : 'your robot'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="truncate font-headline-md text-headline-md text-on-surface">
                      {robotState.robot.name}
                    </h2>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {packageDefinition(robotState.robot.packageSlug).robotClass} · {robotState.robot.packageSlug}
                    </p>
                  </div>
                  <Badge t={robotState.isDemo ? 'outline' : 'tertiary'}>{robotState.robot.lifecycle}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button to="/robot" size="sm">
                    Open Robot
                  </Button>
                  <Button to="/robot/passport" variant="ghost" size="sm">
                    Passport
                  </Button>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                    <Icon name="schedule" className="text-[18px] text-primary" />
                    Next task window
                  </span>
                  <time
                    dateTime={`PT${countdown}S`}
                    aria-label={`Next task window in ${formatCountdown(countdown)}`}
                    className="font-data text-data-sm text-primary"
                  >
                    {formatCountdown(countdown)}
                  </time>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">Shortcuts</h2>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="shrink-0 text-label-md text-primary hover:underline"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>

        <ul className="grid grid-cols-4 gap-y-4">
          {chosen.map((action) => (
            <li key={action.id}>
              {editing ? (
                <div className="flex flex-col items-center gap-2 py-1 text-center">
                  <span className="relative">
                    <IconTile icon={action.icon} accent={action.c} size={52} radius={16} iconSize={28} />
                    <button
                      type="button"
                      onClick={() => persist(ids.filter((id) => id !== action.id))}
                      aria-label={`Remove ${action.label} from shortcuts`}
                      className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-error text-on-error"
                    >
                      <Icon name="remove" className="text-[16px]" />
                    </button>
                  </span>
                  <span className="text-label-md leading-tight text-on-surface">{action.label}</span>
                </div>
              ) : (
                <Link
                  to={action.to}
                  className="flex flex-col items-center gap-2 rounded-xl py-1 text-center active:scale-[.94]"
                >
                  <IconTile icon={action.icon} accent={action.c} size={52} radius={16} iconSize={28} />
                  <span className="text-label-md leading-tight text-on-surface">{action.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>

        {editing && (
          <Card className="mt-5 p-4">
            <SectionTitle action={`${ids.length}/${MAX_SHORTCUTS}`}>Add shortcut</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {available.map((action) => (
                <button
                  type="button"
                  key={action.id}
                  disabled={full}
                  onClick={() => !full && persist([...ids, action.id])}
                  className="tap flex items-center gap-2 rounded-full border border-white/12 px-3 py-2 text-label-md text-on-surface disabled:opacity-45"
                >
                  <Icon name={action.icon} className="text-[18px]" /> {action.label}{' '}
                  <Icon name="add" className="text-[16px] text-outline" />
                </button>
              ))}
            </div>
          </Card>
        )}
      </section>

      <section aria-labelledby="mining-title">
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-surface-container-low shadow-[0_16px_40px_rgba(65,40,120,.12)]">
          <div className="grid sm:grid-cols-[1.1fr_.9fr]">
            <div className="p-5 sm:p-6">
              <p className="text-label-sm font-semibold uppercase tracking-[0.16em] text-primary">WRS Mining</p>
              <h2 id="mining-title" className="mt-2 font-headline-md text-headline-md text-on-surface">
                Put your robot to work.
              </h2>
              <p className="mt-2 max-w-[30ch] text-body-sm text-on-surface-variant">
                Explore approved digital work and track what your robot completes.
              </p>
              <Link
                to="/deploy"
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-primary-container px-5 py-3 text-label-md font-semibold text-white transition-colors hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                Start mining
                <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
            </div>
            <div className="min-h-44 bg-surface-container-lowest sm:min-h-full">
              <img
                src="/robot-deployment-city.png"
                alt="White and graphite robot working in an automated facility"
                className="h-full w-full object-cover object-[58%]"
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="leaderboard-title">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <div>
            <h2 id="leaderboard-title" className="font-headline-md text-headline-md text-on-surface">
              Leaderboard
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">Top owners by approved task XP.</p>
          </div>
          <Icon name="emoji_events" className="text-[24px] text-primary" fill />
        </div>
        <Card className="divide-y divide-outline-variant/20 overflow-hidden">
          {leaderboard.slice(0, 5).map((member) => (
            <div
              key={member.rank}
              className={`flex items-center gap-3 px-4 py-3.5 ${member.you ? 'bg-primary/10' : ''}`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-label-sm font-semibold ${
                  member.rank === 1
                    ? 'bg-[#f2bc42]/20 text-[#8b5e00]'
                    : member.rank === 2
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
                      : member.rank === 3
                        ? 'bg-[#c9855b]/20 text-[#8b4e2c]'
                        : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {member.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                {member.name}
                {member.you && <span className="ml-1 text-label-sm text-primary">(you)</span>}
              </span>
              <span className="shrink-0 text-label-md text-tertiary">{member.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </Card>
      </section>
    </AppShell>
  )
}
