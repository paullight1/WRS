import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Icon, SectionTitle, tone } from '../components/ui.jsx'
import { dataTasks, dataStats } from '../data/mock.js'

const extraTasks = [
  'Object Identification',
  'Sentiment Classification',
  'Human Preference Evaluation',
  'Local Language Validation',
  'Industry Data Labeling',
]

export default function DataContribution() {
  return (
    <AppShell title="Data Contribution" back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="pointer-events-none absolute -right-6 -top-10 opacity-30">
            <Icon name="psychology" className="text-[140px] text-tertiary" />
          </div>
          <div className="relative max-w-[280px]">
            <h2 className="font-headline-lg-mobile text-[24px] leading-tight text-primary">
              Your Data Builds the Future of AI
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              Create and label data. Help improve global AI. Earn rewards.
            </p>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle action="12 New">Available Tasks</SectionTitle>
        <div className="space-y-2">
          {dataTasks.map((t) => {
            const c = tone(t.tone)
            return (
              <Link
                key={t.slug}
                to={`/data/${t.slug}`}
                className="glass flex items-center gap-4 rounded-2xl p-4 transition-all hover:border-white/25 active:scale-[.99]"
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${c.bg} ${c.border}`}>
                  <Icon name={t.icon} className={`${c.text} text-[22px]`} fill />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-headline-md text-[16px] text-on-surface">{t.title}</p>
                  <p className="text-label-sm font-label-sm uppercase tracking-wider text-outline">
                    {t.cat} · {t.time}
                  </p>
                </div>
                <Badge t={t.tone}>+{t.xp} XP</Badge>
              </Link>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {extraTasks.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-label-sm font-label-sm text-outline"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle action="View quality" to="/data/quality">
          Contribution Statistics
        </SectionTitle>
        <Card className="p-card-padding">
          <div className="grid grid-cols-3 gap-4 text-center">
            {dataStats.map((s) => {
              const c = tone(s.tone)
              return (
                <div key={s.label}>
                  <p className="text-label-sm font-label-sm text-on-surface-variant">{s.label}</p>
                  <p className={`font-headline-md text-[22px] font-semibold ${c.text}`}>{s.value}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/5 pt-5 sm:grid-cols-4">
            {[
              ['Approved', '221'],
              ['Rejected', '9'],
              ['Pending review', '18'],
              ['Tasks completed', '186'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-label-sm font-label-sm text-outline">{k}</p>
                <p className="font-headline-md text-[17px] text-on-surface">{v}</p>
              </div>
            ))}
          </div>

          <Button full size="lg" className="mt-6" icon="upload" to="/data/voice-recording">
            Upload / Start Task
          </Button>
        </Card>
      </section>
    </AppShell>
  )
}
