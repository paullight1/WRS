import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import { Badge, Button, Card, Chip, Icon, SectionTitle, tone } from '../components/ui.jsx'
import { packages, comparisonRows } from '../data/mock.js'

/* Row card — the robot portrait carries the tier, so the icon chip is gone. */
function PackageRow({ p, featured = false }) {
  const tag = tone(p.tagTone || p.tone)

  return (
    <Link
      to={`/packages/${p.slug}`}
      className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl p-3.5 transition-all active:scale-[.99] ${
        featured
          ? 'surface border-2 border-tertiary/40 bg-tertiary/[.06] hover:border-tertiary/60'
          : 'surface hover:border-white/25'
      }`}
    >
      <RobotFace
        tier={p.slug}
        size={62}
        className="relative shrink-0 transition-transform duration-300 group-hover:scale-105"
      />

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-title font-semibold text-on-surface">{p.name}</h3>
          {p.badge && <Badge t={p.slug === 'professional' ? 'tertiary' : 'gold'}>{p.badge}</Badge>}
        </div>
        <p className="truncate text-label-sm text-outline">{p.robotClass}</p>
        <span
          className={`mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-label-sm ${tag.bg} ${tag.border} ${tag.text}`}
        >
          {p.tag}
        </span>
      </div>

      <div className="relative flex shrink-0 items-center gap-1">
        <span className="font-headline-md text-headline-md text-on-surface">${p.price.toLocaleString()}</span>
        <Icon name="chevron_right" className="text-outline transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

export default function Packages() {
  const [tab, setTab] = useState('All Packages')
  const featured = packages.find((p) => p.slug === 'professional')

  return (
    <AppShell title="Investment Packages" back avatar={false} wide={tab === 'Compare'}>
      <section className="text-center">
        <h2 className="font-headline-lg-mobile text-[24px] text-on-surface">
          Choose your package and start your robotics journey
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Each tier unlocks a more capable robot class, wider deployment access and higher data participation.
        </p>
      </section>

      <div className="flex justify-center gap-2">
        {['All Packages', 'Compare'].map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)} className="min-w-[140px]">
            {t}
          </Chip>
        ))}
      </div>

      {tab === 'All Packages' ? (
        <>
          {/* ------------------------------------------------- tier ladder */}
          <section className="space-y-3">
            {packages.map((p) => (
              <PackageRow key={p.slug} p={p} featured={p.slug === 'professional'} />
            ))}
          </section>

          {/* --------------------------------------------- featured detail */}
          <section>
            <SectionTitle action="Most chosen">Why Professional</SectionTitle>
            <Card className="border-2 border-tertiary/30 bg-tertiary/5 p-card-padding">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <RobotFace tier="professional" size={84} animate className="shrink-0" />
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Professional</h3>
                    <p className="text-label-md text-tertiary">Professional Robot</p>
                    <Badge t="tertiary" className="mt-2">
                      Best Value
                    </Badge>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="font-headline-lg text-headline-lg font-bold text-on-surface">$100</div>
                  <p className="mb-3 text-label-sm text-on-surface-variant">Own more. Achieve more.</p>
                  <Button to="/packages/professional">Get Professional</Button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 border-t border-white/8 pt-6 sm:grid-cols-2">
                {featured.features.map((f) => (
                  <div key={f} className="flex items-center gap-3 text-body-md text-on-surface-variant">
                    <Icon name="check_circle" className="text-[20px] text-tertiary" fill />
                    {f}
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* ------------------------------------------- robot class ladder */}
          <section>
            <SectionTitle action="Visual guide">Robot class progression</SectionTitle>
            <Card className="p-card-padding">
              <div className="flex items-end justify-between gap-1 overflow-x-auto pb-1 no-scrollbar">
                {packages.map((p, i) => (
                  <Link
                    key={p.slug}
                    to={`/packages/${p.slug}`}
                    className="group flex min-w-[62px] flex-col items-center gap-2"
                  >
                    <RobotFace
                      tier={p.slug}
                      size={40 + i * 4}
                      className="transition-transform group-hover:-translate-y-1"
                    />
                    <span className="text-center text-label-sm leading-tight text-outline group-hover:text-on-surface">
                      {p.robotClass.replace(' Robot', '')}
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-label-sm leading-relaxed text-outline">
                Shells, optics and plating change with the class. Crowned tiers unlock governance, developer access and
                priority global deployment.
              </p>
            </Card>
          </section>

          {/* --------------------------------------------------- benefits */}
          <section>
            <SectionTitle>Estimated Benefits</SectionTitle>
            <Card className="overflow-hidden">
              <div className="grid grid-cols-2 border-b border-white/8 bg-white/5 px-5 py-3">
                <span className="text-label-sm text-outline">Parameter</span>
                <span className="text-right text-label-sm text-outline">Potential</span>
              </div>
              <div className="divide-y divide-white/8">
                {[
                  ['Deployment Opportunities', 'Medium - High', 'text-primary'],
                  ['Platform Rewards', 'Medium', 'text-tertiary'],
                  ['Data Revenue Share', 'Medium', 'text-secondary'],
                  ['Robot Performance', 'High', 'text-tertiary'],
                ].map(([k, v, cls]) => (
                  <div key={k} className="grid grid-cols-2 px-5 py-3.5">
                    <span className="text-body-md text-on-surface">{k}</span>
                    <span className={`text-right text-body-md font-bold ${cls}`}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>
            <p className="mt-3 text-label-sm leading-relaxed text-outline">
              Figures are illustrative. Packages are platform access tiers and do not guarantee profits, fixed returns,
              or income.
            </p>
          </section>
        </>
      ) : (
        <section>
          <SectionTitle>Compare WRS Packages</SectionTitle>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-label-sm text-outline">Category</th>
                  {packages.map((p) => (
                    <th key={p.slug} className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <RobotFace tier={p.slug} size={38} />
                        <span className="text-label-sm text-on-surface">{p.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {comparisonRows.map((r) => (
                  <tr key={r.label}>
                    <td className="whitespace-nowrap px-4 py-3 text-body-md text-on-surface-variant">{r.label}</td>
                    {r.values.map((v, i) => (
                      <td
                        key={i}
                        className={`px-4 py-3 text-center text-label-sm ${
                          i === 2 ? 'bg-tertiary/5 text-tertiary' : 'text-on-surface'
                        }`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Button to="/packages/professional" full size="lg" className="mt-4">
            Select Package
          </Button>
        </section>
      )}
    </AppShell>
  )
}
