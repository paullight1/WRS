import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import { Badge, Button, Card, GradIcon, Icon, Progress, Ring, SectionTitle, Stat, tone, IconTile } from '../components/ui.jsx'
import {
  robot, capabilities, languages, trainingTiles, robotSkills, robotAnalytics, activeDeployments,
} from '../data/mock.js'

const OVERVIEW_ROWS = [
  { icon: 'person', label: 'Status', value: robot.status, cls: 'text-success' },
  { icon: 'rocket_launch', label: 'Deployment', value: robot.currentDeployment },
  { icon: 'battery_full', label: 'Battery', value: `${robot.battery}%` },
  { icon: 'health_and_safety', label: 'Health', value: 'Excellent', cls: 'text-success' },
  { icon: 'schedule', label: 'Last Active', value: robot.lastActive },
]

export default function MyRobot() {
  const [tab, setTab] = useState('Overview')
  const xpPct = (robot.xp / robot.nextLevelXp) * 100

  return (
    <AppShell
      title="My Robot"
      right={
        <Button to="/robot/passport" variant="ghost" size="sm" className="mr-1 hidden sm:inline-flex" icon="badge">
          Passport
        </Button>
      }
    >
      {/* ------------------------------------------------------------ hero */}
      <section>
        <Card className="relative overflow-hidden px-card-padding pb-card-padding pt-6">

          <div className="relative flex items-start justify-between gap-2">
            <Ring value={100} size={84} color="#5b9dff" label="Level" sub={robot.level} />
            <Robot3D size={148} interactive className="-mt-2" label={`${robot.name}, drag to rotate`} />
            <Ring value={xpPct} size={84} color="#00dbe7">
              <span className="block text-label-sm text-outline">XP</span>
              <span className="block text-title font-bold text-on-surface">
                {robot.xp.toLocaleString()}
              </span>
              <span className="block text-[9px] text-outline">
                / {robot.nextLevelXp.toLocaleString()}
              </span>
            </Ring>
          </div>

          {/* pedestal glow under the unit */}

          <div className="relative mt-4">
            <h2 className="font-headline-lg text-headline-lg font-bold leading-none tracking-tight text-on-surface">
              {robot.name}
            </h2>
            <p className="mt-1 text-label-md text-on-surface-variant">{robot.unit}</p>
            <p className="text-label-sm text-success">{robot.robotClass}</p>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <Badge t="success">
              <span className="h-1.5 w-1.5 rounded-full bg-current" /> {robot.status}
            </Badge>
            <Badge t="primary">{robot.package}</Badge>
            <Badge t="outline">ID {robot.id}</Badge>
          </div>
        </Card>
      </section>

      {/* ------------------------------------------------------------- tabs */}
      <div className="surface flex gap-1 rounded-2xl p-1">
        {['Overview', 'Training', 'Skills', 'Analytics'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-2 py-2.5 text-label-sm transition-all ${
              tab === t
                ? 'grad-primary text-white shadow-[0_6px_18px_-6px_rgba(45,91,255,.9)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* --------------------------------------------------------- overview */}
      {tab === 'Overview' && (
        <>
          <Card className="divide-y divide-white/8">
            {OVERVIEW_ROWS.map((r) => (
              <div key={r.label} className="flex items-center gap-3 px-5 py-3.5">
                <Icon name={r.icon} className="text-[20px] text-outline" />
                <span className="flex-1 text-body-md text-on-surface-variant">{r.label}</span>
                <span className={`text-label-md ${r.cls || 'text-on-surface'}`}>{r.value}</span>
              </div>
            ))}
          </Card>

          <section>
            <SectionTitle>Capabilities</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {capabilities.map((c) => {
                const t = tone(c.tone)
                return (
                  <div key={c.label} className="surface flex items-center gap-3 rounded-2xl p-3.5">
                    <IconTile icon={c.icon} accent={t.accent} size={40} radius={12} iconSize={20} />
                    <span className="min-w-0">
                      <span className="block truncate text-label-sm text-outline">{c.label}</span>
                      <span className={`block truncate text-label-md ${t.text}`}>{c.value}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <SectionTitle>Robot Profile</SectionTitle>
            <Card className="divide-y divide-white/8">
              {[
                ['Personality Type', robot.personality],
                ['Voice Profile', robot.voiceProfile],
                ['AI Version', robot.aiVersion],
                ['Career Level', robot.career],
                ['Data Quality Score', `${robot.dataQuality}%`],
                ['Activation Date', robot.activationDate],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <span className="text-body-md text-on-surface-variant">{k}</span>
                  <span className="text-label-md text-on-surface">{v}</span>
                </div>
              ))}
            </Card>
          </section>

          <Button to="/robot/customize" full size="lg" icon="tune">
            Customize Robot
          </Button>
        </>
      )}

      {/* --------------------------------------------------------- training */}
      {tab === 'Training' && (
        <>
          <section>
            <SectionTitle action="Open center" to="/training">
              Module progress
            </SectionTitle>
            <div className="space-y-2">
              {trainingTiles.map((m) => (
                <Card key={m.slug} className="p-3.5">
                  <div className="flex items-center gap-3">
                    <GradIcon icon={m.icon} from={m.from} to={m.to} size={40} radius={13} />
                    <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">{m.title}</span>
                    <span className="text-label-md text-tertiary">{m.progress}%</span>
                  </div>
                  <span className="mt-3 block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${m.progress}%`, backgroundColor: m.from }}
                    />
                  </span>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Languages learned</SectionTitle>
            <Card className="space-y-3 p-card-padding">
              {languages.map((l) => (
                <div key={l.name}>
                  <div className="mb-1.5 flex justify-between text-label-sm">
                    <span className="text-on-surface">{l.name}</span>
                    <span className={l.progress ? 'text-tertiary' : 'text-outline'}>{l.level}</span>
                  </div>
                  <Progress value={l.progress} height="h-1.5" showShimmer={false} />
                </div>
              ))}
            </Card>
          </section>

          <Button to="/training" full size="lg" icon="model_training">
            Train My Robot
          </Button>
        </>
      )}

      {/* ----------------------------------------------------------- skills */}
      {tab === 'Skills' && (
        <>
          <section>
            <SectionTitle action={`${robotSkills.filter((s) => s.progress > 0).length} unlocked`}>
              Installed skills
            </SectionTitle>
            <div className="space-y-2">
              {robotSkills.map((s) => (
                <Card key={s.name} className={`p-3.5 ${s.progress ? '' : 'opacity-55'}`}>
                  <div className="flex items-center gap-3">
                    <GradIcon icon={s.progress ? s.icon : 'lock'} from={s.from} to={s.to} size={44} radius={14} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-md font-medium text-on-surface">{s.name}</p>
                      <p className="text-label-sm text-outline">{s.level}</p>
                    </div>
                    <span className="text-title font-bold text-on-surface">{s.progress}%</span>
                  </div>
                  <span className="mt-3 block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${s.progress}%`, backgroundColor: s.from }}
                    />
                  </span>
                </Card>
              ))}
            </div>
          </section>

          <Button to="/marketplace" variant="tonal" full size="lg" icon="storefront">
            Browse Skill Marketplace
          </Button>
        </>
      )}

      {/* -------------------------------------------------------- analytics */}
      {tab === 'Analytics' && (
        <>
          <section>
            <SectionTitle action="Last 30 days">Performance</SectionTitle>
            <Card className="p-card-padding">
              <div className="flex items-end gap-1.5" style={{ height: 140 }}>
                {robotAnalytics.weekly.map((v, i) => (
                  <div key={i} className="flex-1">
                    <div
                      className="grad-line w-full rounded-t-md transition-all"
                      style={{ height: `${v}%`, opacity: 0.35 + (i / 12) * 0.65 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-label-sm text-outline">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-2 gap-3">
            {robotAnalytics.cards.map((c) => (
              <Stat key={c.label} label={c.label} value={c.value} t={c.tone} icon={c.icon} />
            ))}
          </section>

          <section>
            <SectionTitle action="View all" to="/deploy">
              Active contracts
            </SectionTitle>
            <div className="space-y-2">
              {activeDeployments
                .filter((d) => d.status === 'Active')
                .map((d) => (
                  <Card key={d.id} className="flex items-center gap-3 p-4">
                    <Icon name="rocket_launch" className="text-[20px] text-tertiary" fill />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-md text-on-surface">{d.title}</p>
                      <p className="text-label-sm text-outline">
                        {d.hours} · {d.tasks} tasks
                      </p>
                    </div>
                    <span className="text-label-md text-success">{d.performance}%</span>
                  </Card>
                ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  )
}
