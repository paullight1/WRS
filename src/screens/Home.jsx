import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotAvatar from '../components/RobotAvatar.jsx'
import { Badge, Button, Card, Icon, Progress, SectionTitle, StatusDot, tone } from '../components/ui.jsx'
import { user, robot, todayOverview, latestUpdates } from '../data/mock.js'

const quickActions = [
  { to: '/training', icon: 'model_training', label: 'Train Robot', t: 'primary' },
  { to: '/deploy', icon: 'rocket_launch', label: 'Deploy', t: 'tertiary' },
  { to: '/data', icon: 'dataset', label: 'Add Data', t: 'secondary' },
  { to: '/marketplace', icon: 'storefront', label: 'Marketplace', t: 'primary' },
]

export default function Home() {
  return (
    <AppShell title={`Hello, ${user.firstName} 👋`} subtitle="Welcome to World Robotic System">
      {/* ------------------------------------------------------- robot card */}
      <section>
        <Card className="relative overflow-hidden p-card-padding glow-primary">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary-container/25 blur-[70px]" />

          <div className="relative flex items-start gap-4">
            <div className="shrink-0 animate-float">
              <RobotAvatar size={96} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-label-sm font-label-sm uppercase tracking-widest text-outline">My Robot</p>
                <Badge t="tertiary">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> {robot.status}
                </Badge>
              </div>
              <h2 className="mt-1 font-headline-md text-[22px] font-bold tracking-tight text-on-surface">
                {robot.name}
              </h2>
              <span className="mt-2 inline-block rounded-full border border-primary/20 bg-primary-container/20 px-3 py-1 text-label-sm font-label-sm text-primary">
                {robot.package}
              </span>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/5 bg-black/20 py-3">
            {[
              { label: 'Level', value: robot.level, sub: robot.levelTitle },
              { label: 'XP', value: robot.xp.toLocaleString(), sub: 'Total earned' },
              { label: 'Performance', value: `${robot.performance}%`, sub: 'Last 7 days' },
            ].map((s) => (
              <div key={s.label} className="px-2 text-center">
                <p className="text-label-sm font-label-sm text-outline">{s.label}</p>
                <p className="font-headline-md text-[20px] font-semibold text-on-surface">{s.value}</p>
                <p className="text-[10px] font-label-sm text-outline">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-4 space-y-2">
            <div className="flex justify-between text-label-sm font-label-sm text-outline">
              <span>Next level</span>
              <span>
                {robot.xp.toLocaleString()} / {robot.nextLevelXp.toLocaleString()} XP
              </span>
            </div>
            <Progress value={(robot.xp / robot.nextLevelXp) * 100} />
          </div>
        </Card>
      </section>

      {/* ---------------------------------------------------------- earnings */}
      <section>
        <Card className="flex items-center justify-between gap-4 p-card-padding">
          <div>
            <p className="text-label-sm font-label-sm uppercase tracking-widest text-outline">Total Earnings</p>
            <p className="mt-1 font-headline-lg text-[30px] font-bold text-tertiary text-glow-cyan">$186.40</p>
            <StatusDot label="Confirmed + pending combined" />
          </div>
          <Button to="/wallet" size="sm" className="shrink-0">
            Wallet
          </Button>
        </Card>
      </section>

      {/* ----------------------------------------------------- quick actions */}
      <section>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((a) => {
            const c = tone(a.t)
            return (
              <Link
                key={a.to}
                to={a.to}
                className="glass flex flex-col items-center gap-2 rounded-2xl p-3 transition-all hover:border-white/25 active:scale-95"
              >
                <span className={`grid h-10 w-10 place-items-center rounded-xl border ${c.bg} ${c.border}`}>
                  <Icon name={a.icon} className={`${c.text} text-[20px]`} fill />
                </span>
                <span className="text-center text-[11px] font-label-sm leading-tight text-on-surface-variant">
                  {a.label}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* --------------------------------------------------- today's overview */}
      <section>
        <SectionTitle action="Today" >Today's Overview</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {todayOverview.map((s) => (
            <Card key={s.label} className="p-4">
              <Icon name={s.icon} className="text-[20px] text-primary" />
              <p className="mt-2 font-headline-md text-[22px] font-semibold text-on-surface">{s.value}</p>
              <p className="text-label-sm font-label-sm text-outline">{s.label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- latest updates */}
      <section>
        <SectionTitle action="View All" to="/notifications">
          Latest Updates
        </SectionTitle>
        <div className="space-y-2">
          {latestUpdates.map((u, i) => {
            const c = tone(u.tone)
            return (
              <div key={i} className="glass flex items-center gap-3 rounded-2xl p-3.5">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${c.bg} ${c.border}`}>
                  <Icon name={u.icon} className={`${c.text} text-[20px]`} fill />
                </span>
                <p className="min-w-0 flex-1 truncate text-body-md text-on-surface-variant">{u.text}</p>
                <span className="shrink-0 text-label-sm font-label-sm text-outline">{u.time}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* --------------------------------------------------------- next step */}
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-tertiary/15 blur-[60px]" />
          <div className="relative">
            <p className="text-label-sm font-label-sm uppercase tracking-widest text-tertiary">What's next</p>
            <h3 className="mt-1 font-headline-md text-[19px] text-on-surface">Finish today's voice training</h3>
            <p className="mt-1 text-body-md text-on-surface-variant">
              3 samples left to unlock the Yoruba pronunciation module.
            </p>
            <Button to="/training/voice" className="mt-4" size="sm" trailingIcon="arrow_forward">
              Continue Training
            </Button>
          </div>
        </Card>
      </section>
    </AppShell>
  )
}
