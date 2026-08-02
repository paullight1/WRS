import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { armWelcome } from '../components/WelcomeModal.jsx'
import { Atmosphere } from '../components/AppShell.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import { defaultRobotConfig } from '../data/robotParts.js'
import RobotFace from '../components/RobotFace.jsx'
import { Button, Card, Icon, Progress } from '../components/ui.jsx'
import { personalities, packages } from '../data/mock.js'

const eyeColors = ['#00dbe7', '#b8c3ff', '#ddb7ff', '#ffb4ab', '#3ddc97']

export default function Onboarding() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('WRS-Pro-001')
  const [eye, setEye] = useState(eyeColors[0])
  const [pers, setPers] = useState('Logical')
  const [pkg, setPkg] = useState('professional')

  const steps = ['Welcome', 'Package', 'Name', 'Appearance', 'Personality', 'Finish']
  const next = () => {
    if (step < steps.length - 1) return setStep(step + 1)
    // Home shows the welcome once, on the first arrival after setup.
    armWelcome()
    return nav('/home')
  }

  return (
    <div className="relative flex min-h-screen flex-col px-margin-page py-8">
      <Atmosphere />

      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => (step === 0 ? nav(-1) : setStep(step - 1))}
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-variant/30"
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
          {/* The eye picker below drives the render directly. */}
          <Robot3D
            size={200}
            config={{ ...defaultRobotConfig, colors: { emissive: eye, accent: eye } }}
            interactive
            label="Your robot"
          />
        </div>

        {step === 0 && (
          <div className="text-center">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Meet your robot</h1>
            <p className="mt-3 text-body-md leading-relaxed text-on-surface-variant">
              Your robot is a digital identity you own, train and grow. Everything you teach it makes it more capable —
              and more yours.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Choose a package</h1>
            <div className="space-y-2">
              {packages.slice(0, 4).map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setPkg(p.slug)}
                  className={`surface flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all ${
                    pkg === p.slug ? 'border-tertiary/50 bg-tertiary/5' : ''
                  }`}
                >
                  <RobotFace tier={p.slug} size={44} className="shrink-0" />
                  <span className="flex-1">
                    <span className="block text-body-md text-on-surface">{p.name}</span>
                    <span className="block text-label-sm text-outline">{p.robotClass}</span>
                  </span>
                  <span className="text-title text-on-surface">${p.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Name your robot</h1>
            <Card className="p-card-padding">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-center font-headline-lg-mobile text-headline-lg-mobile text-on-surface outline-none"
              />
              <p className="mt-3 text-center text-label-sm text-outline">
                You can rename it later from Robot Settings.
              </p>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Choose appearance</h1>
            <Card className="p-card-padding">
              <p className="mb-4 text-label-sm text-outline">Optic colour</p>
              <div className="flex justify-between gap-3">
                {eyeColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEye(c)}
                    className={`h-12 w-12 rounded-full border-2 transition-all ${
                      eye === c ? 'scale-110 border-white' : 'border-white/10'
                    }`}
                    style={{ background: c, boxShadow: eye === c ? `0 0 18px ${c}` : 'none' }}
                    aria-label={c}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="mb-4 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Pick a personality</h1>
            <div className="grid grid-cols-2 gap-3">
              {personalities.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPers(p.name)}
                  className={`surface flex flex-col items-center gap-2 rounded-2xl p-5 transition-all ${
                    pers === p.name ? 'border-primary/50 bg-primary-container/15' : ''
                  }`}
                >
                  <Icon name={p.icon} className={pers === p.name ? 'text-primary' : 'text-outline'} />
                  <span className="text-label-md text-on-surface">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center">
            <Icon name="verified" className="mb-3 text-[44px] text-tertiary" fill />
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{name} is ready</h1>
            <p className="mt-3 text-body-md text-on-surface-variant">
              {pers} personality · {packages.find((p) => p.slug === pkg)?.robotClass}
            </p>
            <div className="mt-5 space-y-2 text-left">
              {['Robot ID issued', 'Robot Passport created', 'Wallet activated', 'Training unlocked'].map((t) => (
                <div key={t} className="surface flex items-center gap-3 rounded-xl p-3">
                  <Icon name="check_circle" className="text-tertiary text-[20px]" fill />
                  <span className="text-body-md text-on-surface-variant">{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button full size="lg" className="mt-8" onClick={next} trailingIcon="arrow_forward">
          {step === steps.length - 1 ? 'Enter Dashboard' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
