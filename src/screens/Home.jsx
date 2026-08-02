import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import { ACCENTS, Badge, Button, Card, Icon, IconTile, List, Progress, SectionTitle, tone } from '../components/ui.jsx'
import { user, robot, todayOverview, latestUpdates } from '../data/mock.js'

/* Everything that can sit in the shortcuts grid. A coloured glyph and its
   name, nothing else — the colour does the sorting work. */
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
  { id: 'referrals', to: '/referrals', icon: 'group_add', label: 'Refer', c: ACCENTS.pink },
  { id: 'boosts', to: '/rewards/boosts', icon: 'bolt', label: 'Boosts', c: ACCENTS.amber },
  { id: 'eventcode', to: '/rewards/event-code', icon: 'qr_code_scanner', label: 'Event code', c: ACCENTS.teal },
  { id: 'quality', to: '/data/quality', icon: 'verified', label: 'Quality', c: ACCENTS.green },
  { id: 'support', to: '/support', icon: 'help_outline', label: 'Support', c: ACCENTS.slate },
]

const DEFAULT_IDS = ['training', 'data', 'deploy', 'market', 'wallet', 'rewards', 'academy', 'community']
const MAX_SHORTCUTS = 12
const STORE_KEY = 'wrs.shortcuts'

const loadShortcuts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY))
    if (Array.isArray(saved) && saved.length) return saved.filter((id) => CATALOGUE.some((c) => c.id === id))
  } catch {
    /* first run or unreadable storage — fall through to defaults */
  }
  return DEFAULT_IDS
}

export default function Home() {
  const toNext = robot.nextLevelXp - robot.xp
  const [showPrompt, setShowPrompt] = useState(true)

  const [ids, setIds] = useState(loadShortcuts)
  const [editing, setEditing] = useState(false)

  const persist = (next) => {
    setIds(next)
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable — the change still applies for this session */
    }
  }

  const chosen = ids.map((id) => CATALOGUE.find((c) => c.id === id)).filter(Boolean)
  const available = CATALOGUE.filter((c) => !ids.includes(c.id))
  const full = ids.length >= MAX_SHORTCUTS

  const add = (id) => !full && persist([...ids, id])
  const remove = (id) => persist(ids.filter((x) => x !== id))

  return (
    <AppShell title={`Hello, ${user.firstName}`} subtitle="Here's your robot today">
      {/* --------------------------------------------------------- the robot
          The protagonist, and the one screen element that carries the next
          action — a user should never scroll to find out what to do. */}
      <section>
        <Card accent={ACCENTS.indigo} className="overflow-hidden p-5">
          <div className="flex items-start gap-4">
            <Robot3D size={88} className="shrink-0" label={`${robot.name}, your robot`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 truncate font-headline-md text-headline-md text-on-surface">{robot.name}</h2>
                <Badge t="tertiary">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {robot.status}
                </Badge>
              </div>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                {robot.package} · Level {robot.level}
              </p>

              <div className="mt-3.5">
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="tnum text-label-md text-on-surface">{robot.xp.toLocaleString()} XP</span>
                  <span className="tnum text-label-sm text-on-surface-variant">
                    {toNext.toLocaleString()} to level {robot.level + 1}
                  </span>
                </div>
                <Progress value={(robot.xp / robot.nextLevelXp) * 100} label="Progress to next level" />
              </div>
            </div>
          </div>

        </Card>
      </section>

      {/* ------------------------------------------------------------ prompt
          Today's nudge is its own dismissible card — it's transient, so it
          shouldn't live inside the robot's permanent status panel. */}
      {showPrompt && (
        <section>
          <Card accent={ACCENTS.teal} className="flex items-start gap-3.5 p-4">
            <IconTile icon="mic" accent={ACCENTS.teal} size={40} radius={12} />
            <div className="min-w-0 flex-1">
              <p className="text-title text-on-surface">Finish today's voice training</p>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                3 samples left to unlock Yoruba pronunciation.
              </p>
              <Button to="/training/voice" size="sm" className="mt-3" trailingIcon="arrow_forward">
                Continue training
              </Button>
            </div>
            <button
              onClick={() => setShowPrompt(false)}
              aria-label="Dismiss this reminder"
              className="-mr-1.5 -mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-surface-variant transition-colors duration-fast hover:bg-white/10 hover:text-on-surface"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </Card>
        </section>
      )}

      {/* ----------------------------------------------------- quick actions */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">Shortcuts</h2>
          <button
            onClick={() => setEditing(!editing)}
            className="shrink-0 text-label-md text-primary hover:underline"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>

        <ul className="grid grid-cols-4 gap-y-4">
          {chosen.map((a) => (
            <li key={a.id}>
              {editing ? (
                <div className="flex flex-col items-center gap-2 py-1 text-center">
                  <span className="relative">
                    <IconTile icon={a.icon} accent={a.c} size={52} radius={16} iconSize={28} />
                    <button
                      onClick={() => remove(a.id)}
                      aria-label={`Remove ${a.label} from shortcuts`}
                      className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-error text-on-error transition-transform duration-fast active:scale-90"
                    >
                      <Icon name="remove" className="text-[16px]" />
                    </button>
                  </span>
                  <span className="text-label-md leading-tight text-on-surface">{a.label}</span>
                </div>
              ) : (
                <Link
                  to={a.to}
                  className="flex flex-col items-center gap-2 rounded-xl py-1 text-center transition-transform duration-fast active:scale-[.94]"
                >
                  <IconTile icon={a.icon} accent={a.c} size={52} radius={16} iconSize={28} />
                  <span className="text-label-md leading-tight text-on-surface">{a.label}</span>
                </Link>
              )}
            </li>
          ))}

        </ul>

        {/* Inline picker — no modal, the grid above stays visible while choosing. */}
        {editing && (
          <div className="mt-5 rounded-2xl border border-white/12 bg-surface-container p-4">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-title text-on-surface">Add a shortcut</p>
              <p className="text-label-sm text-on-surface-variant">
                {ids.length}/{MAX_SHORTCUTS} used
              </p>
            </div>

            {available.length ? (
              <ul className="flex flex-wrap gap-2">
                {available.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => add(a.id)}
                      disabled={full}
                      aria-label={`Add ${a.label} to shortcuts`}
                      className="tap flex items-center gap-2 rounded-full border border-white/12 pl-1.5 pr-3.5 transition-colors duration-fast hover:bg-white/[.06] disabled:opacity-45"
                    >
                      <IconTile icon={a.icon} accent={a.c} size={32} radius={10} iconSize={17} />
                      <span className="text-label-md text-on-surface">{a.label}</span>
                      <Icon name="add" className="text-[16px] text-on-surface-variant" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                Every shortcut is already on your home screen.
              </p>
            )}

            {full && (
              <p className="mt-3 text-label-sm text-on-surface-variant">
                Shortcut grid is full — remove one with the red button above to add another.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ today
          Four figures read faster as one strip than as four boxed cards. */}
      <section>
        <SectionTitle action="Today">Activity</SectionTitle>
        <Card className="grid grid-cols-4 divide-x divide-white/8">
          {todayOverview.map((s) => (
            <div key={s.label} className="px-2 py-3.5 text-center">
              <p className="tnum font-headline-md text-headline-md text-on-surface">{s.value}</p>
              <p className="mt-0.5 text-label-sm leading-tight text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </Card>
      </section>

      {/* --------------------------------------------------------- earnings */}
      <section>
        <Link
          to="/wallet"
          className="flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-transform duration-fast active:scale-[.99]"
          style={{ backgroundColor: `${ACCENTS.green}26`, borderColor: `${ACCENTS.green}59` }}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-label-md text-on-surface-variant">Balance</span>
            <span className="tnum block font-headline-md text-headline-md text-on-surface">$186.40</span>
            <span className="block text-label-sm text-on-surface-variant">$154.40 available · $32.00 pending</span>
          </span>
          <Icon name="chevron_right" className="text-outline" />
        </Link>
      </section>

      {/* ----------------------------------------------------------- recent */}
      <section>
        <SectionTitle action="See all" to="/notifications">
          Recent
        </SectionTitle>
        <List>
          {latestUpdates.slice(0, 4).map((u, i) => {
            const c = tone(u.tone)
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <IconTile icon={u.icon} accent={c.accent} size={36} radius={12} iconSize={18} />
                <p className="min-w-0 flex-1 text-body-md text-on-surface">{u.text}</p>
                <span className="shrink-0 text-label-sm text-on-surface-variant">{u.time}</span>
              </div>
            )
          })}
        </List>
      </section>
    </AppShell>
  )
}
