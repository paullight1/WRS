import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import WelcomeModal, { consumeWelcome } from '../components/WelcomeModal.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import StateView from '../components/states/StateView.jsx'
import { ACCENTS, Badge, Button, Card, Icon, IconTile, SectionTitle } from '../components/ui.jsx'
import { packageDefinition } from '../domain/robot/packages.ts'

const CATALOGUE = [
  { id: 'training', to: '/training', icon: 'model_training', label: 'Train', c: ACCENTS.indigo },
  { id: 'data', to: '/data', icon: 'dataset', label: 'Add data', c: ACCENTS.teal },
  { id: 'deploy', to: '/deploy', icon: 'rocket_launch', label: 'Deploy', c: ACCENTS.violet },
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

const DEFAULT_IDS = ['training', 'data', 'deploy', 'market', 'wallet', 'rewards', 'passport', 'customize']
const MAX_SHORTCUTS = 12
const STORE_KEY = 'wrs.shortcuts'

const loadShortcuts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY))
    if (Array.isArray(saved) && saved.length) return saved.filter((id) => CATALOGUE.some((item) => item.id === id))
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

  useEffect(() => {
    if (consumeWelcome()) setWelcome(true)
  }, [])

  const persist = (next) => {
    setIds(next)
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next))
    } catch {
      // Shortcut preferences are non-authoritative UX state.
    }
  }

  const chosen = ids.map((id) => CATALOGUE.find((item) => item.id === id)).filter(Boolean)
  const available = CATALOGUE.filter((item) => !ids.includes(item.id))
  const full = ids.length >= MAX_SHORTCUTS

  return (
    <AppShell title="Home" subtitle={robotState.isDemo ? 'Demo workspace' : 'Verified WRS workspace'}>
      <WelcomeModal open={welcome} onClose={() => setWelcome(false)} />

      {robotState.loading ? (
        <StateView kind="loading" title="Loading your robot" desc="Reading the latest confirmed robot state." />
      ) : !robotState.robot ? (
        <StateView
          kind="locked"
          title={robotState.isDemo ? 'Create your demo robot' : 'Robot provisioning is not complete'}
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
                label={`${robotState.robot.name}, ${robotState.isDemo ? 'demo robot' : 'your robot'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="truncate font-headline-md text-headline-md text-on-surface">{robotState.robot.name}</h2>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {packageDefinition(robotState.robot.packageSlug).robotClass} · {robotState.robot.packageSlug}
                    </p>
                  </div>
                  <Badge t={robotState.isDemo ? 'outline' : 'tertiary'}>
                    {robotState.isDemo ? 'Demo state' : robotState.robot.lifecycle}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button to="/robot" size="sm">Open Robot</Button>
                  <Button to="/robot/passport" variant="ghost" size="sm">Passport</Button>
                </div>
              </div>
            </div>
            <p className="mt-4 text-label-sm text-outline">
              {robotState.isDemo
                ? 'Robot state is stored locally for demonstration only.'
                : 'Robot identity and configuration shown here come from the authoritative robot service. Training, wallet, deployment and reward metrics remain owned by their respective services.'}
            </p>
          </Card>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">Shortcuts</h2>
          <button type="button" onClick={() => setEditing(!editing)} className="shrink-0 text-label-md text-primary hover:underline">
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
                <Link to={action.to} className="flex flex-col items-center gap-2 rounded-xl py-1 text-center active:scale-[.94]">
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
                  <Icon name={action.icon} className="text-[18px]" /> {action.label} <Icon name="add" className="text-[16px] text-outline" />
                </button>
              ))}
            </div>
          </Card>
        )}
      </section>

      <section>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Icon name="verified_user" className="mt-0.5 text-tertiary" />
            <div>
              <p className="text-title text-on-surface">Authoritative boundaries</p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                WRS no longer mixes demo wallet balances, fabricated XP, deployment performance or training progress into the production home screen. Open each service area to see only the state that service can verify.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  )
}
