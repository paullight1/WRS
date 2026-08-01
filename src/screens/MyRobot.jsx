import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import RobotAvatar from '../components/RobotAvatar.jsx'
import { Badge, Button, Card, Icon, Progress, SectionTitle, Stat, Tabs, tone } from '../components/ui.jsx'
import { robot, capabilities, languages, trainingModules } from '../data/mock.js'

export default function MyRobot() {
  const [tab, setTab] = useState('Overview')

  return (
    <AppShell
      title="My Robot"
      right={
        <Button to="/robot/customize" variant="ghost" size="sm" className="mr-1 hidden sm:inline-flex" icon="tune">
          Customize
        </Button>
      }
    >
      {/* ------------------------------------------------------------ header */}
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-tertiary/15 blur-[70px]" />
          <div className="relative flex items-center gap-4">
            <RobotAvatar size={92} className="animate-float" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-headline-md text-[21px] font-bold text-on-surface">{robot.name}</h2>
                <Icon name="edit" className="text-[16px] text-outline" />
              </div>
              <p className="text-label-sm font-label-sm text-primary">{robot.package}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge t="tertiary">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> {robot.status}
                </Badge>
                <Badge t="primary">ID {robot.id}</Badge>
              </div>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-3">
            <Stat label="Level" value={robot.level} t="primary" />
            <Stat label="XP" value={robot.xp.toLocaleString()} t="tertiary" />
            <Stat label="Health" value={`${robot.health}%`} t="success" />
          </div>
        </Card>
      </section>

      <Tabs items={['Overview', 'Training', 'Performance']} value={tab} onChange={setTab} />

      {/* ---------------------------------------------------------- overview */}
      {tab === 'Overview' && (
        <>
          <section>
            <SectionTitle>Capabilities</SectionTitle>
            <div className="space-y-2">
              {capabilities.map((c) => {
                const t = tone(c.tone)
                return (
                  <div key={c.label} className="glass flex items-center gap-3 rounded-2xl p-4">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl border ${t.bg} ${t.border}`}>
                      <Icon name={c.icon} className={`${t.text} text-[20px]`} fill />
                    </span>
                    <span className="flex-1 text-body-md text-on-surface">{c.label}</span>
                    <span className={`text-label-md font-label-md ${t.text}`}>{c.value}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <SectionTitle>Robot Profile</SectionTitle>
            <Card className="divide-y divide-white/5">
              {[
                ['Personality Type', robot.personality],
                ['Voice Profile', robot.voiceProfile],
                ['AI Version', robot.aiVersion],
                ['Career Level', robot.career],
                ['Data Quality Score', `${robot.dataQuality}%`],
                ['Robot Reputation', robot.reputation],
                ['Activation Date', robot.activationDate],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <span className="text-body-md text-on-surface-variant">{k}</span>
                  <span className="text-label-md font-label-md text-on-surface">{v}</span>
                </div>
              ))}
            </Card>
          </section>

          <section className="grid gap-2 sm:grid-cols-2">
            <Button to="/training" full icon="model_training">
              Train My Robot
            </Button>
            <Button to="/robot/passport" variant="ghost" full icon="badge">
              View Robot Passport
            </Button>
            <Button to="/robot/customize" variant="tonal" full icon="tune">
              Customize Robot
            </Button>
            <Button to="/packages" variant="tonal" full icon="upgrade">
              Upgrade Package
            </Button>
          </section>
        </>
      )}

      {/* ---------------------------------------------------------- training */}
      {tab === 'Training' && (
        <>
          <section>
            <SectionTitle action="Open center" to="/training">
              Module progress
            </SectionTitle>
            <div className="space-y-2">
              {trainingModules.map((m) => {
                const t = tone(m.tone)
                return (
                  <Card key={m.slug} className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 place-items-center rounded-xl border ${t.bg} ${t.border}`}>
                        <Icon name={m.icon} className={`${t.text} text-[20px]`} fill />
                      </span>
                      <span className="flex-1 text-body-md text-on-surface">{m.title}</span>
                      <span className={`text-label-md font-label-md ${t.text}`}>{m.progress}%</span>
                    </div>
                    <Progress value={m.progress} className="mt-3" height="h-1.5" />
                  </Card>
                )
              })}
            </div>
          </section>

          <section>
            <SectionTitle>Languages learned</SectionTitle>
            <Card className="space-y-3 p-card-padding">
              {languages.map((l) => (
                <div key={l.name}>
                  <div className="mb-1.5 flex justify-between text-label-sm font-label-sm">
                    <span className="text-on-surface">{l.name}</span>
                    <span className={l.progress ? 'text-tertiary' : 'text-outline'}>{l.level}</span>
                  </div>
                  <Progress value={l.progress} height="h-1.5" showShimmer={false} />
                </div>
              ))}
            </Card>
          </section>
        </>
      )}

      {/* ------------------------------------------------------- performance */}
      {tab === 'Performance' && (
        <>
          <section>
            <SectionTitle action="Last 30 days">Performance</SectionTitle>
            <Card className="p-card-padding">
              <div className="flex items-end gap-1.5" style={{ height: 140 }}>
                {[52, 61, 48, 73, 66, 81, 74, 88, 79, 92, 85, 92].map((v, i) => (
                  <div key={i} className="flex-1">
                    <div
                      className="w-full rounded-t-md grad-line transition-all"
                      style={{ height: `${v}%`, opacity: 0.35 + (i / 12) * 0.65 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-label-sm font-label-sm text-outline">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Stat label="Success Rate" value="97%" t="tertiary" icon="task_alt" />
            <Stat label="Productivity" value="92" t="primary" icon="speed" />
            <Stat label="Client Rating" value="4.8" t="secondary" icon="star" />
            <Stat label="Safety Score" value="99" t="success" icon="health_and_safety" />
          </section>

          <Button to="/deploy/active" variant="tonal" full icon="monitoring">
            View Active Deployment
          </Button>
        </>
      )}
    </AppShell>
  )
}
