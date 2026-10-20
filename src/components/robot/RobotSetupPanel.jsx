import { Button, Card, Icon } from '../ui.jsx'

export default function RobotSetupPanel({ robotState }) {
  const { authoritative, error, isDemo, loading, onboarding, refresh } = robotState
  const serviceReady = authoritative === true && !isDemo

  let title = 'Set up your robot'
  let description = 'Your robot is not ready yet. Follow a few simple steps to build it and get started.'
  let action = (
    <Button to="/onboarding" icon="arrow_forward">
      Set up my robot
    </Button>
  )

  if (isDemo) {
    title = 'Robot setup unavailable'
    description = 'Robot setup is not available in this preview. Open the live WRS app to set up your robot.'
    action = null
  } else if (!serviceReady) {
    title = 'Robot setup is not ready yet'
    description = 'Robot setup is not ready here yet. Please try again later.'
    action = null
  } else if (error) {
    title = 'Robot setup unavailable'
    description = 'We could not open robot setup. Try again.'
    action = (
      <Button onClick={() => void refresh?.()} icon="refresh" loading={loading}>
        Try again
      </Button>
    )
  } else if (onboarding) {
    title = 'Finish setting up your robot'
    description = 'Your progress is saved. Pick up where you left off.'
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
