import AppShell from '../components/AppShell.jsx'
import { Badge, Card, Icon, Progress, SectionTitle } from '../components/ui.jsx'
import { qualityScores, robot } from '../data/mock.js'

const levels = ['Beginner', 'Verified', 'Skilled', 'Advanced', 'Expert', 'Elite Contributor']
const current = 3 // Advanced

export default function DataQuality() {
  return (
    <AppShell title="Contribution Quality" back avatar={false}>
      <section>
        <Card className="p-card-padding text-center">
          <p className="text-label-sm text-outline">Overall quality score</p>
          <p className="mt-2 font-headline-lg text-display-lg font-bold text-tertiary">{robot.dataQuality}%</p>
          <Badge t="tertiary" className="mt-2">
            {levels[current]}
          </Badge>
          <p className="mt-4 text-body-md text-on-surface-variant">
            Higher-quality contributors receive access to advanced, higher-value tasks.
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle>Score breakdown</SectionTitle>
        <Card className="space-y-4 p-card-padding">
          {qualityScores.map((s) => (
            <div key={s.label}>
              <div className="mb-1.5 flex justify-between text-label-sm">
                <span className="text-on-surface-variant">{s.label}</span>
                <span className="text-tertiary">{s.value}%</span>
              </div>
              <Progress value={s.value} height="h-1.5" showShimmer={false} />
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Trust level</SectionTitle>
        <div className="space-y-2">
          {levels.map((l, i) => (
            <div
              key={l}
              className={`surface flex items-center gap-3 rounded-2xl p-3.5 ${
                i === current ? 'border-tertiary/40 bg-tertiary/5' : i > current ? 'opacity-50' : ''
              }`}
            >
              <Icon
                name={i < current ? 'check_circle' : i === current ? 'stars' : 'lock'}
                className={`text-[20px] ${i <= current ? 'text-tertiary' : 'text-outline'}`}
                fill={i <= current}
              />
              <span className="flex-1 text-body-md text-on-surface">{l}</span>
              {i === current && <Badge t="tertiary">Current</Badge>}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
