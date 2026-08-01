import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Icon, ListRow, Progress, SectionTitle, Toast, tone } from '../components/ui.jsx'
import { robot, rewardWays } from '../data/mock.js'

export default function Rewards() {
  const [code, setCode] = useState('')
  const [toast, setToast] = useState('')

  const claim = () => {
    setToast(code ? 'Code submitted for verification' : 'Enter a valid event code')
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <AppShell title="Points & Rewards" back avatar={false}>
      {/* --------------------------------------------------------- xp card */}
      <section>
        <Card className="relative overflow-hidden p-card-padding text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-tertiary/10 opacity-40" />
          <div className="relative">
            <p className="text-label-md font-label-md uppercase tracking-widest text-tertiary">Your Robot XP</p>
            <div className="relative my-5">
              <div className="absolute inset-x-10 inset-y-0 rounded-full bg-tertiary/20 blur-2xl" />
              <p className="relative font-headline-lg text-[52px] font-bold leading-none tracking-tight text-on-surface text-glow-cyan">
                {robot.xp.toLocaleString()}{' '}
                <span className="font-headline-md text-[24px] text-tertiary">XP</span>
              </p>
            </div>
            <span className="inline-block rounded-full border border-white/5 bg-surface-container-highest/50 px-4 py-1.5 text-label-md font-label-md text-on-surface">
              Level {robot.level} — {robot.levelTitle}
            </span>

            <div className="mt-7 space-y-2 text-left">
              <div className="flex justify-between text-label-sm font-label-sm">
                <span className="text-outline">Current: {robot.xp.toLocaleString()} XP</span>
                <span className="text-on-surface-variant">Next: {robot.nextLevelXp.toLocaleString()} XP</span>
              </div>
              <Progress value={(robot.xp / robot.nextLevelXp) * 100} height="h-3" />
            </div>
          </div>
        </Card>
      </section>

      {/* ---------------------------------------------------- ways to earn */}
      <section>
        <SectionTitle>Ways to Earn Points</SectionTitle>
        <div className="space-y-2">
          {rewardWays.map((w) => (
            <ListRow
              key={w.label}
              icon={w.icon}
              t={w.tone}
              title={w.label}
              subtitle={w.desc}
              right={<span className="shrink-0 text-label-md font-label-md text-tertiary">+{w.xp} XP</span>}
            />
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- badges */}
      <section>
        <SectionTitle action="8 earned">Badges</SectionTitle>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['military_tech', 'First Deploy', true],
            ['record_voice_over', 'Voice Pro', true],
            ['translate', 'Polyglot', true],
            ['local_fire_department', '30-day Streak', true],
            ['diamond', 'Elite Data', false],
            ['public', 'Ambassador', false],
            ['science', 'Beta Tester', false],
            ['emoji_events', 'Top 100', false],
          ].map(([icon, label, earned]) => (
            <div
              key={label}
              className={`glass flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center ${earned ? '' : 'opacity-40'}`}
            >
              <Icon name={icon} className={earned ? 'text-tertiary text-[24px]' : 'text-outline text-[24px]'} fill={earned} />
              <span className="text-[10px] font-label-sm leading-tight text-on-surface-variant">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- event code */}
      <section>
        <Card className="p-card-padding">
          <h3 className="text-body-lg font-bold text-on-surface">Enter Event Code</h3>
          <p className="mb-4 mt-1 text-label-sm font-label-sm text-outline">
            Valid for 5–10 minutes after event disclosure.
          </p>
          <div className="flex gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="WRS-847219"
              className="flex-1 rounded-xl border border-outline-variant bg-black/30 px-4 py-3 font-label-md text-on-surface outline-none transition-all placeholder:text-outline/50 focus:border-tertiary focus:shadow-[0_0_15px_rgba(0,219,231,.2)]"
            />
            <Button onClick={claim}>Claim</Button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-label-sm font-label-sm text-outline">Code expires in 07:45</span>
            <Button to="/rewards/event-code" variant="ghost" size="sm">
              Details
            </Button>
          </div>
        </Card>
      </section>

      <ListRow icon="bolt" t="tertiary" title="Robot Boosts" subtitle="Spend points on robot upgrades" to="/rewards/boosts" />

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
