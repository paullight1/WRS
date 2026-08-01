import AppShell from '../components/AppShell.jsx'
import { Badge, Card, Disclosure, Icon, Progress, SectionTitle, Stat } from '../components/ui.jsx'

const weights = [
  { label: 'Package participation weight', value: 25, note: 'Professional tier' },
  { label: 'Quality score weight', value: 45, note: '94% quality' },
  { label: 'Contribution volume weight', value: 30, note: '248 accepted items' },
]

export default function DataRevenue() {
  return (
    <AppShell title="AI Data Revenue" back avatar={false}>
      <section className="grid grid-cols-2 gap-3">
        <Stat label="Approved data" value="221" t="tertiary" icon="verified" />
        <Stat label="Datasets joined" value="6" t="primary" icon="dataset" />
        <Stat label="Active licences" value="3" t="secondary" icon="handshake" />
        <Stat label="Payment status" value="Settled" t="success" icon="paid" />
      </section>

      <section>
        <SectionTitle>Distribution breakdown</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['Gross dataset revenue', '$8,420.00', 'text-on-surface'],
            ['Platform fees', '-$2,105.00', 'text-error'],
            ['Contributor pool allocation', '$6,315.00', 'text-on-surface'],
            ['Your net distribution', '$35.40', 'text-tertiary'],
          ].map(([k, v, cls]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className={`font-label-md text-label-md ${cls}`}>{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>How your share is weighted</SectionTitle>
        <Card className="space-y-4 p-card-padding">
          {weights.map((w) => (
            <div key={w.label}>
              <div className="mb-1.5 flex justify-between text-label-sm font-label-sm">
                <span className="text-on-surface-variant">{w.label}</span>
                <span className="text-tertiary">{w.value}%</span>
              </div>
              <Progress value={w.value} height="h-1.5" showShimmer={false} />
              <p className="mt-1 text-[11px] font-label-sm text-outline">{w.note}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Also considered</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {['Rarity of language', 'Customer demand', 'Consent category', 'Validation score', 'Platform terms'].map(
            (x) => (
              <Badge key={x} t="outline">
                {x}
              </Badge>
            ),
          )}
        </div>
      </section>

      <Disclosure icon="balance">
        Package level influences eligibility and weighting, but high-quality data remains the primary driver of
        contributor value. Only data you consented to license is included.
      </Disclosure>
    </AppShell>
  )
}
