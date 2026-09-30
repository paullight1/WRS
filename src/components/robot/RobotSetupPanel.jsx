import { Button, Card, Icon } from '../ui.jsx'

export default function RobotSetupPanel({ robotState }) {
  const { authoritative, error, isDemo, loading, onboarding, refresh } = robotState
  const serviceReady = authoritative === true && !isDemo

  let title = 'Set up your robot'
  let description = 'Create a robot account and configuration to get started.'
  let action = (
    <Button to="/onboarding" icon="arrow_forward">
      Start setup
    </Button>
  )

  if (isDemo) {
    title = 'Robot setup unavailable'
    description = 'Live robot setup is disabled in preview mode. Use a verified WRS environment to provision a robot.'
    action = null
  } else if (!serviceReady) {
    title = 'Robot service unavailable'
    description = 'Robot provisioning is not enabled for this environment.'
    action = null
  } else if (error) {
    title = 'Robot setup unavailable'
    description = error
    action = (
      <Button onClick={() => void refresh?.()} icon="refresh" loading={loading}>
        Retry
      </Button>
    )
  } else if (onboarding) {
    title = 'Continue robot setup'
    description = 'Your saved setup is ready to finish.'
    action = (
      <Button to="/onboarding" icon="arrow_forward">
        Continue setup
      </Button>
    )
  }

  return (
    <section aria-label="Robot setup">
      <Card className="flex items-start gap-4 p-4 sm:p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tertiary/15 text-tertiary">
          <Icon name="smart_toy" size={26} fill />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-headline-sm text-title text-on-surface">{title}</h2>
          <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">{description}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </Card>
    </section>
  )
}
