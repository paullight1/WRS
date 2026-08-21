import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Icon, SectionTitle } from '../components/ui.jsx'
import { hasCapability, packageDefinition } from '../domain/robot/packages.ts'

export default function MyRobot() {
  const robotState = useRobot()
  const [tab, setTab] = useState('Overview')

  if (robotState.loading) {
    return (
      <AppShell title="My Robot">
        <StateView kind="loading" title="Loading robot" desc="Reading current robot ownership and configuration." />
      </AppShell>
    )
  }

  if (!robotState.robot) {
    return (
      <AppShell title="My Robot">
        <StateView
          kind="locked"
          title={robotState.isDemo ? 'No demo robot yet' : 'Authoritative robot state is unavailable'}
          desc={robotState.error || 'Provision your robot before opening this workspace.'}
          action={<Button to="/onboarding">Open onboarding</Button>}
        />
      </AppShell>
    )
  }

  const robot = robotState.robot
  const configuration = robotState.configuration
  const definition = packageDefinition(robot.packageSlug)
  const capabilities = definition.capabilities

  return (
    <AppShell
      title="My Robot"
      right={
        <Button to="/robot/passport" variant="ghost" size="sm" className="mr-1 hidden sm:inline-flex" icon="badge">
          Passport
        </Button>
      }
    >
      <section>
        <Card className="relative overflow-hidden px-card-padding pb-card-padding pt-6">
          <div className="flex items-center justify-center">
            <Robot3D
              size={190}
              interactive
              config={configuration || undefined}
              label={`${robot.name}, ${robotState.isDemo ? 'demo state' : 'authoritative state'}`}
            />
          </div>
          <div className="mt-3 text-center">
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">{robot.name}</h2>
            <p className="mt-1 text-label-md text-on-surface-variant">{definition.robotClass}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge t={robotState.isDemo ? 'outline' : 'tertiary'}>
                {robotState.isDemo ? 'Demo robot' : robot.lifecycle}
              </Badge>
              <Badge t="primary">{definition.name}</Badge>
              <Badge t="outline">ID {robot.id}</Badge>
            </div>
          </div>
        </Card>
      </section>

      <div className="surface flex gap-1 rounded-2xl p-1">
        {['Overview', 'Configuration', 'Capabilities', 'Services'].map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setTab(item)}
            className={`flex-1 rounded-xl px-2 py-2.5 text-label-sm transition-all ${tab === item ? 'grad-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          <section>
            <SectionTitle>Authoritative identity</SectionTitle>
            <Card className="divide-y divide-white/8">
              {[
                ['Owner user ID', robot.ownerUserId],
                ['Lifecycle', robot.lifecycle],
                ['Active package', definition.name],
                ['Requested package', robot.requestedPackageSlug],
                ['Activation', new Date(robot.activationDate).toLocaleDateString()],
                ['Public verification ID', robot.publicVerificationId],
              ].map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <span className="text-body-md text-on-surface-variant">{key}</span>
                  <span className="max-w-[58%] break-all text-right text-label-md text-on-surface">{value}</span>
                </div>
              ))}
            </Card>
          </section>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button to="/robot/customize" full icon="tune">
              Customize Robot
            </Button>
            <Button to="/robot/passport" variant="ghost" full icon="badge">
              Open Passport
            </Button>
          </div>
        </>
      )}

      {tab === 'Configuration' && (
        <section>
          <SectionTitle action={configuration ? `v${configuration.version}` : 'Unavailable'}>
            Confirmed configuration
          </SectionTitle>
          {configuration ? (
            <Card className="divide-y divide-white/8">
              {[
                ['Palette', configuration.palette],
                ['Personality', configuration.personality],
                ['Voice profile', configuration.voiceProfileId],
                ['Processing speed', `${configuration.tuning.speed}%`],
                ['Battery optimization', `${configuration.tuning.battery}%`],
                ['Sensor sensitivity', `${configuration.tuning.sensor}%`],
                ['Last confirmed', new Date(configuration.updatedAt).toLocaleString()],
              ].map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <span className="text-body-md text-on-surface-variant">{key}</span>
                  <span className="text-right text-label-md text-on-surface">{value}</span>
                </div>
              ))}
            </Card>
          ) : (
            <StateView
              kind="empty"
              title="No configuration record"
              desc="The robot service has not returned a confirmed configuration."
            />
          )}
        </section>
      )}

      {tab === 'Capabilities' && (
        <section>
          <SectionTitle action={`${capabilities.length} active`}>Package capabilities</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <Card key={capability} className="flex items-center gap-3 p-3.5">
                <Icon name="check_circle" className="text-tertiary" fill />
                <span className="text-body-md text-on-surface">{capability}</span>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-label-sm text-outline">
            Capability checks are repeated server-side when configuration, marketplace or deployment operations are
            attempted. UI visibility is not authorization.
          </p>
        </section>
      )}

      {tab === 'Services' && (
        <section>
          <SectionTitle>Connected service boundaries</SectionTitle>
          <Card className="divide-y divide-white/8">
            {[
              ['Training', '/training', 'Training progress belongs to the training service.'],
              ['Data contribution', '/data', 'Quality and contribution records belong to the data service.'],
              ['Deployment', '/deploy', 'Contracts and telemetry belong to the deployment service.'],
              ['Wallet', '/wallet', 'Balances and settlement belong to the financial ledger.'],
            ].map(([label, to, description]) => (
              <div key={label} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-body-md text-on-surface">{label}</p>
                  <p className="text-label-sm text-outline">{description}</p>
                </div>
                <Button to={to} size="sm" variant="ghost">
                  Open
                </Button>
              </div>
            ))}
          </Card>
          <p className="mt-3 text-label-sm text-outline">
            Example: this robot {hasCapability(robot.packageSlug, 'deployment.standard') ? 'has' : 'does not have'} the
            package capability for standard deployment, but a deployment still requires independent eligibility and
            contract approval.
          </p>
        </section>
      )}
    </AppShell>
  )
}
