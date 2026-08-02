import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { Button, Card, GradIcon, Icon, ListRow, SectionTitle } from '../components/ui.jsx'
import { robot, earnActions } from '../data/mock.js'

/* Inline trophy — keeps the hero self-contained (no image assets). */
function Trophy({ size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="animate-float" role="img" aria-label="Trophy">
      <defs>
        <linearGradient id="tr-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="45%" stopColor="#f7c948" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        <radialGradient id="tr-glow">
          <stop offset="0%" stopColor="rgba(247,201,72,.55)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="48" r="44" fill="url(#tr-glow)" />
      <path d="M26 18h48v20a24 24 0 0 1-48 0z" fill="url(#tr-gold)" />
      <path d="M26 22h-10a14 14 0 0 0 14 14zM74 22h10a14 14 0 0 1-14 14z" fill="#f7c948" opacity=".85" />
      <rect x="44" y="60" width="12" height="14" rx="2" fill="#d9a520" />
      <path d="M32 86c0-7 8-12 18-12s18 5 18 12z" fill="url(#tr-gold)" />
      <path d="M50 24l3.6 7.6 8.4 1-6.2 5.8 1.6 8.2L50 42.8 42.6 46.6l1.6-8.2L38 32.6l8.4-1z" fill="#fffbe8" />
    </svg>
  )
}

export default function Rewards() {
  const remaining = robot.nextLevelXp - robot.xp

  return (
    <AppShell title="Rewards & Points" back avatar={false}>
      {/* ---------------------------------------------------------- hero */}
      <section>
        <Card className="relative overflow-hidden border-primary/25 bg-primary-container/[.12] p-card-padding">
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-label-md text-on-surface-variant">Your Points</p>
              <p className="font-headline-lg text-display-lg font-bold leading-none tracking-tight text-white">
                {robot.xp.toLocaleString()}
              </p>
            </div>
            <Trophy size={104} />
          </div>

          <div className="relative mt-5">
            <p className="mb-2 text-label-md text-on-surface">Level {robot.level}</p>
            <span className="block h-2 w-full overflow-hidden rounded-full bg-black/40">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(robot.xp / robot.nextLevelXp) * 100}%`,
                  backgroundColor: '#f7c948',
                }}
              />
            </span>
            <p className="mt-2 text-label-sm text-outline">
              Next Level: {remaining.toLocaleString()} XP
            </p>
          </div>
        </Card>
      </section>

      {/* -------------------------------------------------- how to earn */}
      <section>
        <SectionTitle>How to Earn Points</SectionTitle>
        <Card className="divide-y divide-white/8 p-2">
          {earnActions.map((a) => (
            <Link
              key={a.label}
              to={a.link}
              className="flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-white/[.04]"
            >
              <GradIcon icon={a.icon} from={a.from} to={a.to} size={38} radius={12} />
              <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">{a.label}</span>
              <span className="shrink-0 text-label-md text-success">+{a.xp} XP</span>
            </Link>
          ))}
        </Card>
      </section>

      {/* ---------------------------------------------------------- badges */}
      <section>
        <SectionTitle action="4 earned">Badges</SectionTitle>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['military_tech', 'First Deploy', '#4ade80', '#15803d', true],
            ['record_voice_over', 'Voice Pro', '#0fd6b0', '#0a7f8c', true],
            ['translate', 'Polyglot', '#ffa63d', '#e0611a', true],
            ['local_fire_department', '30-day Streak', '#ff5f9e', '#c62368', true],
            ['diamond', 'Elite Data', '#57c9ff', '#1f6fd0', false],
            ['public', 'Ambassador', '#a78bfa', '#6d28d9', false],
            ['science', 'Beta Tester', '#4ade80', '#15803d', false],
            ['emoji_events', 'Top 100', '#f7c948', '#b8860b', false],
          ].map(([icon, label, from, to, earned]) => (
            <div
              key={label}
              className={`surface flex flex-col items-center gap-2 rounded-2xl p-3 text-center ${
                earned ? '' : 'opacity-40 grayscale'
              }`}
            >
              <GradIcon icon={icon} from={from} to={to} size={36} radius={12} />
              <span className="text-label-sm leading-tight text-on-surface-variant">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ event code */}
      <div>
        <Button to="/rewards/event-code" full size="lg" icon="confirmation_number">
          Enter Event Code
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-label-sm text-outline">
          <Icon name="timer" className="text-[15px]" />
          Event codes expire in 5 – 10 minutes
        </p>
      </div>

      <section>
        <SectionTitle>Spend your points</SectionTitle>
        <div className="space-y-2">
          <ListRow
            icon="bolt"
            t="tertiary"
            title="Robot Boosts"
            subtitle="Spend points on robot upgrades"
            to="/rewards/boosts"
          />
          <ListRow
            icon="storefront"
            t="secondary"
            title="Marketplace"
            subtitle="Skills, language packs and modules"
            to="/marketplace"
          />
          <ListRow
            icon="leaderboard"
            t="primary"
            title="Leaderboard"
            subtitle="See where you rank this season"
            to="/community"
          />
        </div>
      </section>
    </AppShell>
  )
}
