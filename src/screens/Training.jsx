import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, GradIcon, Icon, Progress, SectionTitle, Tabs, tone, IconTile } from '../components/ui.jsx'
import { trainingTiles, contribution, dataTasks } from '../data/mock.js'

/* Colourful launcher tile — the core of the training grid. */
function TrainingTile({ t }) {
  return (
    <Link
      to={`/training/${t.slug}`}
      className="surface group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl px-2.5 py-5 text-center transition-all hover:border-white/25 active:scale-[.97]"
    >
      <GradIcon
        icon={t.icon}
        from={t.from}
        to={t.to}
        size={54}
        radius={18}
        className="relative transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105"
      />
      <span className="relative mt-1 block text-[13px] font-medium leading-tight text-on-surface">{t.title}</span>
      <span className="relative block text-[11px] leading-tight text-outline">{t.desc}</span>
      <span
        className="relative mt-1 h-1 w-10 overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,.1)' }}
      >
        <span className="block h-full rounded-full" style={{ width: `${t.progress}%`, backgroundColor: t.from }} />
      </span>
    </Link>
  )
}

export default function Training() {
  const [tab, setTab] = useState('Train')
  const overall = Math.round(trainingTiles.reduce((s, t) => s + t.progress, 0) / trainingTiles.length)

  return (
    <AppShell title="AI Training Center" subtitle="Train your robot with your data" back avatar={false}>
      <Tabs items={['Train', 'Data Tasks']} value={tab} onChange={setTab} />

      {tab === 'Train' ? (
        <>
          {/* ------------------------------------------------- colourful grid */}
          <section>
            <div className="grid grid-cols-3 gap-3">
              {trainingTiles.map((t) => (
                <TrainingTile key={t.slug} t={t} />
              ))}
            </div>
          </section>

          {/* ------------------------------------------------- contributions */}
          <section>
            <Card className="relative overflow-hidden p-card-padding">
              <div className="relative flex items-center gap-4">
                <GradIcon icon="workspace_premium" from="#57c9ff" to="#1f6fd0" size={52} radius={16} />
                <div className="min-w-0 flex-1">
                  <p className="text-title font-semibold text-on-surface">Your Contributions</p>
                  <p className="text-label-md text-success">{contribution.quality}</p>
                </div>
                <Button to="/data/quality" size="sm">
                  View
                </Button>
              </div>

              <div className="relative mt-5">
                <Progress value={(contribution.score / contribution.target) * 100} height="h-2.5" />
                <div className="mt-2 flex items-center justify-between text-label-sm">
                  <span className="text-on-surface">Score: {contribution.score.toLocaleString()}</span>
                  <span className="text-outline">Target {contribution.target.toLocaleString()}</span>
                </div>
              </div>

              <div className="relative mt-5 grid grid-cols-3 gap-3 border-t border-white/8 pt-4 text-center">
                {[
                  ['Submitted', contribution.submissions],
                  ['Approved', contribution.approved],
                  ['Day streak', contribution.streak],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-title font-bold text-on-surface">{v}</p>
                    <p className="text-label-sm text-outline">{k}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <div>
            <div className="mb-3 flex items-center justify-between text-label-sm">
              <span className="text-outline">Overall training completion</span>
              <span className="text-tertiary">{overall}%</span>
            </div>
            <Progress value={overall} className="mb-4" />
            <Button to="/training/voice" full size="lg" icon="play_arrow">
              Continue Training
            </Button>
          </div>
        </>
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
                  className="surface flex items-center gap-4 rounded-2xl p-4 transition-all hover:border-white/25"
                >
                  <IconTile icon={t.icon} accent={c.accent} size={48} radius={12} iconSize={22} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-medium text-on-surface">{t.title}</p>
                    <p className="text-label-sm text-outline">
                      {t.cat} · {t.time}
                    </p>
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
