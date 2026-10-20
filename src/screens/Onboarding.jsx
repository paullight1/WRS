import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { armWelcome } from '../components/WelcomeModal.jsx'
import AppShell, { Atmosphere } from '../components/AppShell.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import { Button, Card, Icon, Progress } from '../components/ui.jsx'
import StateView from '../components/states/StateView.jsx'
import { defaultParts } from '../data/robotParts.js'
import { personalities } from '../data/mock.js'

const eyeColors = [
  { label: 'Aqua', value: '#00dbe7', palette: 'Oceania Flow' },
  { label: 'Violet', value: '#ddb7ff', palette: 'Neon Genesis' },
  { label: 'Gold', value: '#ffd700', palette: 'Empire Gold' },
  { label: 'Silver', value: '#8e90a2', palette: 'Deep Carbon' },
  { label: 'Orange', value: '#ffa63d', palette: 'Solar Flare' },
  { label: 'Green', value: '#4ade80', palette: 'Verdant Core' },
]
const onboardingTuning = { speed: 70, battery: 75, sensor: 68 }
const steps = ['Welcome', 'Name', 'Look', 'Personality', 'Finish']
const FLOW_VERSION = 2
const personalityLabels = {
  Logical: 'Thoughtful',
  Empathetic: 'Kind',
  Aggressive: 'Bold',
  Protective: 'Protective',
}
const personalityHints = {
  Logical: 'Thinks before acting',
  Empathetic: 'Understands people',
  Aggressive: 'Acts with confidence',
  Protective: 'Keeps people safe',
}

function resumeStep(draft) {
  if (!draft) return 0
  const step = Number(draft.step) || 0
  const currentStep = draft.flowVersion === FLOW_VERSION ? step : Math.max(0, step - 1)
  return Math.max(0, Math.min(steps.length - 1, currentStep))
}

function eyeColorForPalette(palette) {
  return eyeColors.find((color) => color.palette === palette)?.value || eyeColors[0].value
}

export default function Onboarding() {
  const nav = useNavigate()
  const robotState = useRobot()
  const draft = robotState.onboarding
  const [step, setStep] = useState(() => resumeStep(draft))
  const [name, setName] = useState(() => draft?.name ?? 'WRS-Pro-001')
  const [eye, setEye] = useState(() => eyeColorForPalette(draft?.palette))
  const [personality, setPersonality] = useState(() => draft?.personality ?? 'Logical')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!draft) return undefined
    const resumed = draft
    queueMicrotask(() => {
      setStep(resumeStep(resumed))
      setName(resumed.name || 'WRS-Pro-001')
      setEye(eyeColorForPalette(resumed.palette))
      setPersonality(resumed.personality || 'Logical')
    })
    return undefined
  }, [draft])

  const palette = useMemo(() => eyeColors.find((color) => color.value === eye)?.palette || 'Oceania Flow', [eye])

  const completionInput = useMemo(
    () => ({
      name: name.trim(),
      // Keep onboarding free; the server still checks paid entitlements elsewhere.
      requestedPackageSlug: 'free',
      palette,
      parts: defaultParts,
      personality,
      tuning: onboardingTuning,
      voiceProfileId: 'standard-en',
    }),
    [name, palette, personality],
  )

  if (robotState.isDemo) {
    return (
      <AppShell title="Robot setup unavailable" avatar={false}>
        <StateView
          kind="locked"
          title="Robot provisioning unavailable"
          desc="Robot provisioning requires a verified account and a connected robot service."
          action={<Button to="/home">Return home</Button>}
        />
      </AppShell>
    )
  }

  const persistStep = async (nextStep) => {
    await robotState.saveOnboardingDraft({
      ...completionInput,
      step: nextStep,
      flowVersion: FLOW_VERSION,
    })
  }

  const next = async () => {
    setMessage('')
    if (step === 1 && name.trim().length < 3) {
      setMessage('Use at least 3 characters in the robot name.')
      return
    }

    if (step < steps.length - 1) {
      const nextStep = step + 1
      setStep(nextStep)
      setSaving(true)
      try {
        await persistStep(nextStep)
      } catch {
        setMessage('We could not save your progress. You can keep setting up your robot.')
      } finally {
        setSaving(false)
      }
      return
    }

    setSaving(true)
    try {
      const result = await robotState.completeOnboarding(completionInput)
      if (result.status === 'entitlement-required') {
        setMessage('We could not set up your free robot right now. Please try again.')
        return
      }
      armWelcome()
      nav('/home', { replace: true })
    } catch {
      setMessage('We could not set up your robot. Please try again.')
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
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-blue-400/30 bg-[#142d5c] text-blue-50 active:bg-[#1a3b78] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
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
            label="Your robot preview"
          />
        </div>

        {step === 0 && (
          <div className="text-center">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Set up your robot</h1>
            <p className="mt-3 text-body-md leading-relaxed text-on-surface-variant">
              Choose a name, a look, and a personality.
            </p>
            <Card className="mt-5 flex items-center gap-3 border-blue-400/60 bg-[#142d5c] p-4 text-left shadow-[0_8px_28px_rgba(37,99,235,0.2)]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500 text-white">
                <Icon name="smart_toy" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-label-md font-semibold text-white">Free robot</h2>
                <p className="mt-1 text-label-sm text-blue-100">Basic Robot · No payment needed</p>
              </div>
              <Icon name="check_circle" className="text-blue-200" fill />
            </Card>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Name your robot</h1>
            <Card className="border-blue-400/35 bg-[#142d5c] p-card-padding">
              <input
                value={name}
                maxLength={32}
                onChange={(event) => setName(event.target.value)}
                className="w-full bg-transparent text-center font-headline-lg-mobile text-headline-lg-mobile text-white outline-none placeholder:text-blue-200/70"
                aria-label="Robot name"
              />
            </Card>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Choose its look</h1>
            <Card className="p-card-padding">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-label-sm text-outline">Eye color</p>
                <p className="text-label-sm font-semibold text-blue-200">
                  {eyeColors.find((color) => color.value === eye)?.label}
                </p>
              </div>
              <div className="grid grid-cols-3 justify-items-center gap-3 sm:flex sm:justify-between">
                {eyeColors.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    onClick={() => setEye(color.value)}
                    aria-pressed={eye === color.value}
                    aria-label={`${color.label} eyes`}
                    className={`grid h-12 w-12 touch-manipulation place-items-center rounded-full border-2 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${eye === color.value ? 'scale-110 border-white shadow-[0_0_18px_rgba(59,130,246,0.55)]' : 'border-white/20'}`}
                    style={{
                      background: color.value,
                    }}
                  >
                    {eye === color.value && <Icon name="check" className="text-blue-950" />}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="mb-2 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Choose how your robot acts
            </h1>
            <p className="mb-4 text-body-sm text-on-surface-variant">Tap one choice.</p>
            <div className="grid grid-cols-2 gap-3">
              {personalities.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => setPersonality(item.name)}
                  aria-pressed={personality === item.name}
                  className={`flex min-h-28 touch-manipulation flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 active:scale-[.98] ${personality === item.name ? 'border-blue-300 bg-[#2563eb] text-white shadow-[0_8px_24px_rgba(37,99,235,0.3)]' : 'border-blue-400/35 bg-[#142d5c] text-blue-50 hover:bg-[#1a3b78]'}`}
                >
                  <Icon name={item.icon} className="text-white" />
                  <span className="text-label-md font-semibold">{personalityLabels[item.name] || item.name}</span>
                  <span className="text-label-sm text-blue-100">{personalityHints[item.name]}</span>
                  {personality === item.name && <Icon name="check_circle" className="text-white" fill />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <Icon name="fact_check" className="mb-3 text-[44px] text-tertiary" fill />
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Ready to create your robot?</h1>
            <div className="mt-5 grid grid-cols-2 gap-2 text-left">
              {[
                ['Robot', name],
                ['Plan', 'Free'],
                ['Eye color', eyeColors.find((color) => color.value === eye)?.label || 'Aqua'],
                ['Personality', personalityLabels[personality] || personality],
              ].map(([label, value]) => (
                <Card key={label} className="border-blue-400/30 bg-[#142d5c] p-3">
                  <p className="text-label-sm text-blue-200">{label}</p>
                  <p className="mt-1 truncate text-label-md font-semibold text-white">{value}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {message && (
          <p role="alert" className="mt-5 rounded-xl border border-error/30 bg-error/10 p-3 text-label-sm text-error">
            {message}
          </p>
        )}

        <Button
          full
          size="lg"
          className="sticky bottom-4 z-10 mt-8 min-h-14 border border-blue-300/40 bg-[#2563eb] text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8]"
          onClick={next}
          loading={saving}
          trailingIcon={step === steps.length - 1 ? 'check_circle' : 'arrow_forward'}
        >
          {step === steps.length - 1 ? 'Create my robot' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
