import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { armWelcome } from '../components/WelcomeModal.jsx'
import { Atmosphere } from '../components/AppShell.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import RobotFace from '../components/RobotFace.jsx'
import { Button, Card, Icon, Progress } from '../components/ui.jsx'
import { defaultParts } from '../data/robotParts.js'
import { personalities, packages } from '../data/mock.js'

const eyeColors = ['#00dbe7', '#b8c3ff', '#ddb7ff', '#ffb4ab', '#3ddc97']
const onboardingTuning = { speed: 70, battery: 75, sensor: 68 }
const steps = ['Welcome', 'Package', 'Name', 'Appearance', 'Personality', 'Finish']

export default function Onboarding() {
  const nav = useNavigate()
  const robotState = useRobot()
  const draft = robotState.onboarding
  const [step, setStep] = useState(() => draft?.step ?? 0)
  const [name, setName] = useState(() => draft?.name ?? 'WRS-Pro-001')
  const [eye, setEye] = useState('#00dbe7')
  const [personality, setPersonality] = useState(() => draft?.personality ?? 'Logical')
  const [packageSlug, setPackageSlug] = useState(
    () => draft?.requestedPackageSlug ?? 'professional',
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!draft) return undefined
    const resumed = draft
    queueMicrotask(() => {
      setStep((current) => (current === 0 ? resumed.step : current))
      setName(resumed.name || 'WRS-Pro-001')
      setPersonality(resumed.personality || 'Logical')
      setPackageSlug(resumed.requestedPackageSlug || 'professional')
    })
    return undefined
  }, [draft])

  const palette = useMemo(() => {
    if (eye === '#ddb7ff') return 'Neon Genesis'
    if (eye === '#8e90a2') return 'Deep Carbon'
    if (eye === '#ffa63d') return 'Solar Flare'
    return 'Oceania Flow'
  }, [eye])

  const completionInput = useMemo(
    () => ({
      name: name.trim(),
      requestedPackageSlug: packageSlug,
      palette,
      parts: defaultParts,
      personality,
      tuning: onboardingTuning,
      voiceProfileId: 'standard-en',
    }),
    [name, packageSlug, palette, personality],
  )

  const persistStep = async (nextStep) => {
    await robotState.saveOnboardingDraft({
      ...completionInput,
      step: nextStep,
    })
  }

  const next = async () => {
    setMessage('')
    if (step === 2 && name.trim().length < 3) {
      setMessage('Robot name must be at least three characters.')
      return
    }

    if (step < steps.length - 1) {
      const nextStep = step + 1
      setSaving(true)
      try {
        await persistStep(nextStep)
        setStep(nextStep)
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : 'Unable to save onboarding progress.',
        )
      } finally {
        setSaving(false)
      }
      return
    }

    setSaving(true)
    try {
      const result = await robotState.completeOnboarding(completionInput)
      if (result.status === 'entitlement-required') {
        setMessage(
          `The ${result.packageSlug} package is not active on this account. Activate the entitlement before provisioning the robot.`,
        )
        return
      }
      armWelcome()
      nav('/home', { replace: true })
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Robot provisioning could not be confirmed.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col px-margin-page py-8">
      <Atmosphere />
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (step === 0 ? nav(-1) : setStep(step - 1))}
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-variant/30"
            aria-label="Back"
          >
            <Icon name="arrow_back" className="text-on-surface-variant" />
          </button>
          <div className="flex-1">
            <Progress value={((step + 1) / steps.length) * 100} height="h-1.5" />
          </div>
          <span className="text-label-sm text-outline">
            {step + 1}/{steps.length}
          </span>
        </div>

        <div className="mb-8 flex justify-center">
          <Robot3D
            size={200}
            config={{
              palette,
              parts: defaultParts,
              personality,
              tuning: onboardingTuning,
              colors: { emissive: eye, accent: eye },
            }}
            interactive
            label={robotState.isDemo ? 'Demo robot preview' : 'Your robot preview'}
          />
        </div>

        {step === 0 && (
          <div className="text-center">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Set up your robot
            </h1>
            <p className="mt-3 text-body-md leading-relaxed text-on-surface-variant">
              {robotState.isDemo
                ? 'This demo stores setup state on this device only. No paid entitlement or live robot is created.'
                : 'Your setup is saved as you progress. Robot provisioning occurs only after the server verifies your active package entitlement.'}
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Select the package your robot should use
            </h1>
            <div className="space-y-2">
              {packages.map((pkg) => (
                <button
                  type="button"
                  key={pkg.slug}
                  onClick={() => setPackageSlug(pkg.slug)}
                  className={`surface flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all ${packageSlug === pkg.slug ? 'border-tertiary/50 bg-tertiary/5' : ''}`}
                >
                  <RobotFace tier={pkg.slug} size={44} className="shrink-0" />
                  <span className="flex-1">
                    <span className="block text-body-md text-on-surface">{pkg.name}</span>
                    <span className="block text-label-sm text-outline">{pkg.robotClass}</span>
                  </span>
                  <span className="text-title text-on-surface">${pkg.price}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-label-sm text-outline">
              Selecting a package here does not purchase or activate it. The server verifies the
              account entitlement at completion.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Name your robot
            </h1>
            <Card className="p-card-padding">
              <input
                value={name}
                maxLength={32}
                onChange={(event) => setName(event.target.value)}
                className="w-full bg-transparent text-center font-headline-lg-mobile text-headline-lg-mobile text-on-surface outline-none"
                aria-label="Robot name"
              />
            </Card>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Choose appearance
            </h1>
            <Card className="p-card-padding">
              <p className="mb-4 text-label-sm text-outline">Optic colour</p>
              <div className="flex justify-between gap-3">
                {eyeColors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setEye(color)}
                    className={`h-12 w-12 rounded-full border-2 transition-all ${eye === color ? 'scale-110 border-white' : 'border-white/10'}`}
                    style={{
                      background: color,
                      boxShadow: eye === color ? `0 0 18px ${color}` : 'none',
                    }}
                    aria-label={`Use optic colour ${color}`}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Pick a personality
            </h1>
            <div className="grid grid-cols-2 gap-3">
              {personalities.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => setPersonality(item.name)}
                  className={`surface flex flex-col items-center gap-2 rounded-2xl p-5 transition-all ${personality === item.name ? 'border-primary/50 bg-primary-container/15' : ''}`}
                >
                  <Icon
                    name={item.icon}
                    className={personality === item.name ? 'text-primary' : 'text-outline'}
                  />
                  <span className="text-label-md text-on-surface">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center">
            <Icon name="fact_check" className="mb-3 text-[44px] text-tertiary" fill />
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Ready to provision {name}
            </h1>
            <p className="mt-3 text-body-md text-on-surface-variant">
              {personality} · {packages.find((pkg) => pkg.slug === packageSlug)?.robotClass}
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left text-body-sm text-on-surface-variant">
              <p>
                Completion requests one atomic server transaction for entitlement validation,
                robot creation, configuration and passport projection.
              </p>
              <p className="mt-2">
                No Robot ID, passport, wallet or training entitlement is claimed until that
                transaction succeeds.
              </p>
            </div>
          </div>
        )}

        {message && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-error/30 bg-error/10 p-3 text-label-sm text-error"
          >
            {message}
          </p>
        )}

        <Button
          full
          size="lg"
          className="mt-8"
          onClick={next}
          loading={saving}
          trailingIcon="arrow_forward"
        >
          {step === steps.length - 1
            ? robotState.isDemo
              ? 'Create Demo Robot'
              : 'Provision Robot'
            : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
