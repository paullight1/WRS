import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import StateView from '../components/states/StateView.jsx'
import RobotSetupPanel from '../components/robot/RobotSetupPanel.jsx'
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

  if (robotState.isDemo || !robotState.robot) {
    return (
      <AppShell title="My Robot">
        <RobotSetupPanel robotState={robotState} />
      </AppShell>
    )
  }

  const robot = robotState.robot
  const configuration = robotState.configuration
  const definition = packageDefinition(robot.packageSlug)
  const capabilities = definition.capabilities
  const capabilityLabels = {
    'robot.core': 'Robot controls',
    'training.basic': 'Learn new skills',
    'data.basic': 'Help with data tasks',
    'marketplace.basic': 'Explore the marketplace',
    'deployment.standard': 'Work in a chosen field',
    'deployment.regulated': 'Support regulated work',
    'voice.custom': 'Use a custom voice',
    'tuning.advanced': 'Advanced settings',
    'analytics.advanced': 'Advanced progress reports',
    'robot.elite-modules': 'Elite skills',
    'robot.visionary-modules': 'Visionary skills',
  }
  const voiceName = (id) => {
    if (!id) return 'Not set'
    if (id === 'standard-en') return 'English'
    if (id === 'standard-yo') return 'Yoruba'
    if (String(id).toLowerCase().includes('custom')) return 'Custom voice'
    return 'Standard voice'
  }
  const percentLabel = (value) => {
    if (value === null || value === undefined || value === '') return 'Not set'
    const number = Number(value)
    return Number.isFinite(number) ? `${number}%` : 'Not set'
  }
  const dateLabel = (value) => {
    if (!value) return 'Not available'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString()
  }

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
              label={`${robot.name}, verified robot`}
            />
          </div>
          <div className="mt-3 text-center">
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">{robot.name}</h2>
            <p className="mt-1 text-label-md text-on-surface-variant">{definition.robotClass}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge t="tertiary">{robot.lifecycle}</Badge>
              <Badge t="primary">{definition.name}</Badge>
            </div>
          </div>
        </Card>
      </section>

      <div className="surface flex gap-1 rounded-2xl p-1">
        {['Overview', 'Settings', 'Skills', 'More'].map((item) => (
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
            <SectionTitle>What your robot can do</SectionTitle>
            <Card className="p-4 sm:p-5">
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                Your {definition.robotClass.toLowerCase()} can learn through training and help with data tasks. You can
                change how it looks and sounds at any time.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge t="tertiary">Training</Badge>
                <Badge t="primary">Data tasks</Badge>
                <Badge t="outline">{definition.name} plan</Badge>
              </div>
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

      {tab === 'Settings' && (
        <section>
          <SectionTitle action={configuration ? 'Ready' : 'Unavailable'}>Robot settings</SectionTitle>
          {configuration ? (
            <Card className="divide-y divide-white/8">
              {[
                ['Look', configuration.palette || 'Not set'],
                ['Personality', configuration.personality || 'Not set'],
                ['Voice', voiceName(configuration.voiceProfileId)],
                ['Work speed', percentLabel(configuration.tuning?.speed)],
                ['Battery life', percentLabel(configuration.tuning?.battery)],
                ['Senses', percentLabel(configuration.tuning?.sensor)],
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
              title="Robot settings are not ready yet"
              desc="You can still see your robot and the skills it can use. Check back for settings later."
            />
          )}
          {configuration && (
            <details className="surface mt-3 rounded-2xl p-4">
              <summary className="cursor-pointer text-label-md font-semibold text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                Technical details
              </summary>
              <dl className="mt-3 space-y-2 text-label-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Settings version</dt>
                  <dd className="text-on-surface">{configuration.version || 'Not available'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Voice ID</dt>
                  <dd className="max-w-[60%] break-all text-right text-on-surface">{configuration.voiceProfileId || 'Not available'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Last updated</dt>
                  <dd className="text-right text-on-surface">{dateLabel(configuration.updatedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Robot ID</dt>
                  <dd className="max-w-[60%] break-all text-right text-on-surface">{robot.id}</dd>
                </div>
              </dl>
            </details>
          )}
        </section>
      )}

      {tab === 'Skills' && (
        <section>
          <SectionTitle action={`${capabilities.length} ready`}>Your robot’s skills</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <Card key={capability} className="flex items-center gap-3 p-3.5">
                <Icon name="check_circle" className="text-tertiary" fill />
                <span className="text-body-md text-on-surface">{capabilityLabels[capability] || 'Extra skill'}</span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {tab === 'More' && (
        <section>
          <SectionTitle>Keep going</SectionTitle>
          <Card className="divide-y divide-white/8">
            {[
              ['Training', '/training', 'Help your robot learn new skills.'],
              ['Data tasks', '/data', 'Complete tasks and see your progress.'],
              ['Mining', '/deploy', 'Choose a worksite and start a mining cycle.'],
              ['Wallet', '/wallet', 'See your RoboCoin and account history.'],
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
          {!hasCapability(robot.packageSlug, 'deployment.standard') && (
            <p className="mt-3 text-label-sm text-outline">
              Some work options unlock as your robot grows.
            </p>
          )}
        </section>
      )}
    </AppShell>
  )
}
