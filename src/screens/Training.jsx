import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Icon, Progress, SectionTitle, Tabs, tone } from '../components/ui.jsx'
import { trainingModules, dataTasks } from '../data/mock.js'

export default function Training() {
  const [tab, setTab] = useState('My Training')

  return (
    <AppShell title="AI Training Center" back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-primary-container/25 blur-[70px]" />
          <div className="relative">
            <p className="text-label-sm font-label-sm uppercase tracking-widest text-tertiary">Training Center</p>
            <h2 className="mt-1 font-headline-lg-mobile text-[24px] text-on-surface">
              Personalize and make your robot smarter
            </h2>
            <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">
              Use your voice, language, knowledge, movements and data. Everything you teach stays attached to your robot.
            </p>
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-label-sm font-label-sm text-outline">
                <span>Overall training</span>
                <span>41%</span>
              </div>
              <Progress value={41} />
            </div>
          </div>
        </Card>
      </section>

      <Tabs items={['My Training', 'Data Tasks']} value={tab} onChange={setTab} />

      {tab === 'My Training' ? (
        <section>
          <SectionTitle action="6 modules">Training Modules</SectionTitle>
          <div className="space-y-2">
            {trainingModules.map((m) => {
              const c = tone(m.tone)
              return (
                <Link
                  key={m.slug}
                  to={`/training/${m.slug}`}
                  className="glass block rounded-2xl p-4 transition-all hover:border-white/25 active:scale-[.99]"
                >
                  <div className="flex items-center gap-4">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${c.bg} ${c.border}`}>
                      <Icon name={m.icon} className={`${c.text} text-[22px]`} fill />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-md font-medium text-on-surface">{m.title}</p>
                      <p className="truncate text-label-sm font-label-sm text-outline">{m.desc}</p>
                    </div>
                    <Icon name="chevron_right" className="shrink-0 text-outline" />
                  </div>
                  <Progress value={m.progress} className="mt-3" height="h-1.5" showShimmer={false} />
                </Link>
              )
            })}
          </div>
          <Button to="/training/voice" full size="lg" className="mt-4" icon="play_arrow">
            Start Training
          </Button>
        </section>
      ) : (
        <section>
          <SectionTitle action="12 new">Available Data Tasks</SectionTitle>
          <div className="space-y-2">
            {dataTasks.map((t) => {
              const c = tone(t.tone)
              return (
                <Link
                  key={t.slug}
                  to={`/data/${t.slug}`}
                  className="glass flex items-center gap-4 rounded-2xl p-4 transition-all hover:border-white/25"
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${c.bg} ${c.border}`}>
                    <Icon name={t.icon} className={`${c.text} text-[22px]`} fill />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-medium text-on-surface">{t.title}</p>
                    <p className="text-label-sm font-label-sm uppercase tracking-wider text-outline">{t.cat}</p>
                  </div>
                  <Badge t={t.tone}>+{t.xp} XP</Badge>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </AppShell>
  )
}
