import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import RobotFace from '../components/RobotFace.jsx'
import { Badge, Button, Card, GradIcon, Icon, SectionTitle } from '../components/ui.jsx'
import { packages } from '../data/mock.js'

const CONFETTI = [
  ['#00dbe7', '8%', '12%', '0s'],
  ['#ff5f9e', '22%', '4%', '.25s'],
  ['#f7c948', '78%', '9%', '.5s'],
  ['#4ade80', '90%', '20%', '.15s'],
  ['#a78bfa', '64%', '2%', '.4s'],
  ['#5b9dff', '38%', '18%', '.6s'],
]

export default function PaymentSuccess() {
  const { slug } = useParams()
  const p = packages.find((x) => x.slug === slug)
  if (!p) return <Navigate to="/packages" replace />

  return (
    <AppShell title="Payment Successful" back={false} avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding text-center">
          {CONFETTI.map(([bg, left, top, delay]) => (
            <span
              key={left}
              className="pointer-events-none absolute h-2 w-2 animate-float rounded-sm"
              style={{ background: bg, left, top, animationDelay: delay }}
            />
          ))}

          <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-success/40 bg-success/10">
            <Icon name="check" className="text-[42px] text-success" fill />
          </div>

          <h2 className="relative mt-5 font-headline-lg-mobile text-[24px] font-bold text-on-surface">
            Your {p.name} Package is active
          </h2>
          <p className="relative mt-2 text-body-md text-on-surface-variant">
            Payment of ${p.price.toLocaleString()} confirmed. Your {p.robotClass} has been provisioned and linked to
            your WRS ID.
          </p>

          <div className="relative mt-6 flex items-center justify-center gap-4">
            <RobotFace tier={p.slug} size={96} animate />
            <div className="text-left">
              <Badge t={p.tone}>{p.robotClass}</Badge>
              <p className="mt-2 text-title font-bold text-on-surface">Unit provisioned</p>
              <p className="text-label-sm text-outline">Ref WRS-{p.slug.toUpperCase()}-785432</p>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>What's unlocked now</SectionTitle>
        <div className="space-y-2">
          {[
            ['rocket_launch', 'Deployment access', `${p.deployment.length} sectors opened`, '#5b9dff', '#1d3fd6'],
            ['model_training', 'AI training center', 'All modules for this tier', '#a78bfa', '#6d28d9'],
            ['dataset', 'Data contribution', `${p.data.length} data programmes`, '#4ade80', '#15803d'],
            ['storefront', 'Marketplace', p.slug === 'starter' ? 'Community catalogue' : 'Full catalogue', '#ffa63d', '#e0611a'],
          ].map(([icon, title, desc, from, to]) => (
            <Card key={title} className="flex items-center gap-3.5 p-3.5">
              <GradIcon icon={icon} from={from} to={to} size={42} radius={13} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-md font-medium text-on-surface">{title}</span>
                <span className="block truncate text-label-sm text-outline">{desc}</span>
              </span>
              <Icon name="check_circle" className="text-[20px] text-success" fill />
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Receipt</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Package', `${p.name} — ${p.robotClass}`],
            ['Amount', `$${p.price.toLocaleString()}`],
            ['Status', 'Confirmed'],
            ['Reference', `WRS-${p.slug.toUpperCase()}-785432`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <div className="space-y-3">
        <Button to="/robot" full size="lg" icon="smart_toy">
          Meet My Robot
        </Button>
        <Button to="/training" variant="tonal" full size="lg" icon="model_training">
          Start Training
        </Button>
        <Button to="/wallet/transactions" variant="ghost" full size="lg" icon="receipt_long">
          View Transaction
        </Button>
      </div>
    </AppShell>
  )
}
