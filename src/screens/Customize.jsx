import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import { Badge, Button, Card, Icon, SectionTitle, Toast } from '../components/ui.jsx'
import StateView from '../components/states/StateView.jsx'
import { palettes, personalities } from '../data/mock.js'
import { defaultParts, defaultTuning, modules } from '../data/robotParts.js'

const voices = [
  { id: 'standard-en', name: 'Standard English', capability: null },
  { id: 'standard-yo', name: 'Standard Yoruba', capability: null },
  { id: 'custom-en-yo', name: 'Custom EN/YO', capability: 'voice.custom' },
]

const extraPalettes = [
  { name: 'Solar Flare', colors: ['#ffa63d', '#e0611a', '#2b1405'], state: 'Owned' },
  { name: 'Verdant Core', colors: ['#4ade80', '#15803d', '#08160e'], state: 'Owned' },
]

const tabs = ['Parts', 'Colors', 'Voice', 'Traits']

function initialConfiguration(configuration) {
  return {
    palette: configuration?.palette || 'Oceania Flow',
    parts: configuration?.parts || defaultParts,
    personality: configuration?.personality || 'Logical',
    tuning: configuration?.tuning || defaultTuning,
    voiceProfileId: configuration?.voiceProfileId || 'standard-en',
  }
}

export default function Customize() {
  const robotState = useRobot()
  const [tab, setTab] = useState('Parts')
  const [draft, setDraft] = useState(() => initialConfiguration(robotState.configuration))
  const [activeModule, setActiveModule] = useState('head')
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (robotState.configuration) setDraft(initialConfiguration(robotState.configuration))
  }, [robotState.configuration])

  const allPalettes = useMemo(() => [...palettes, ...extraPalettes], [])
  const robotName = robotState.robot?.name || 'Robot'

  if (robotState.loading) {
    return <AppShell title="Customize Robot" back avatar={false}><StateView kind="loading" title="Loading robot configuration" desc="Reading the latest confirmed configuration." /></AppShell>
  }

  if (!robotState.robot) {
    return (
      <AppShell title="Customize Robot" back avatar={false}>
        <StateView
          kind="locked"
          title={robotState.isDemo ? 'Create the demo robot first' : 'Authoritative robot state is unavailable'}
          desc={robotState.error || 'Complete onboarding before changing robot configuration.'}
          action={<Button to="/onboarding">Open onboarding</Button>}
        />
      </AppShell>
    )
  }

  const setPart = (key, value) => setDraft((current) => ({ ...current, parts: { ...current.parts, [key]: value } }))
  const setTuning = (key, value) => setDraft((current) => ({ ...current, tuning: { ...current.tuning, [key]: value } }))

  const saveRobot = async () => {
    setSaving(true)
    setMessage('')
    try {
      const result = await robotState.saveRobotConfiguration(draft)
      if (result.status === 'saved') {
        setDraft(initialConfiguration(result.configuration))
        setToast(robotState.isDemo ? 'Demo configuration stored on this device' : 'Configuration confirmed by robot service')
        setTimeout(() => setToast(''), 2400)
        return
      }
      if (result.status === 'conflict') {
        setDraft(initialConfiguration(result.current))
        setMessage('This robot changed elsewhere. The latest server configuration has been loaded; review it before saving again.')
        return
      }
      if (result.status === 'capability-locked') {
        setMessage(`Your active package does not include ${result.capability}. The server rejected the change.`)
        return
      }
      setMessage('This account is not authorized to modify that robot.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Configuration could not be confirmed. Your previous state was restored.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      title="Customize Robot"
      subtitle={`${robotName}${robotState.isDemo ? ' · demo state' : ' · authoritative state'}`}
      back
      avatar={false}
    >
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <Robot3D
            fill
            size={360}
            config={{
              palette: draft.palette,
              parts: draft.parts,
              personality: draft.personality,
              tuning: draft.tuning,
            }}
            highlight={tab === 'Parts' ? activeModule : null}
            interactive
            label={`${robotName}, unsaved configuration preview`}
          />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Badge t="primary">{draft.personality}</Badge>
            <Badge t="tertiary">{draft.palette}</Badge>
            <Badge t="outline">v{robotState.configuration?.version || 1}</Badge>
          </div>
          <p className="mt-3 text-center text-label-sm text-outline">
            Preview changes are local until Save Robot is confirmed by the robot service.
          </p>
        </Card>
      </section>

      <div className="grid grid-cols-4 gap-2">
        {tabs.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setTab(item)}
            className={`surface rounded-xl px-2 py-3 text-label-sm transition-colors ${tab === item ? 'border-tertiary/50 bg-tertiary/10 text-on-surface' : 'text-outline'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Parts' && (
        <>
          <section>
            <SectionTitle>Robot parts</SectionTitle>
            <div className="space-y-2">
              {modules.map((module) => (
                <Card key={module.key} className="p-3.5">
                  <button
                    type="button"
                    onClick={() => setActiveModule(module.key)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="text-body-md text-on-surface">{module.name}</span>
                    <Icon name={activeModule === module.key ? 'expand_less' : 'expand_more'} className="text-outline" />
                  </button>
                  {activeModule === module.key && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {module.options.map((option) => {
                        const active = draft.parts[module.key] === option.id
                        return (
                          <button
                            type="button"
                            key={option.id}
                            onClick={() => setPart(module.key, option.id)}
                            className={`rounded-xl border p-3 text-left ${active ? 'border-tertiary/60 bg-tertiary/10' : 'border-white/10 bg-white/[.02]'}`}
                          >
                            <span className="block text-label-md text-on-surface">{option.name}</span>
                            <span className="mt-1 block text-label-sm text-outline">{option.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Performance tuning</SectionTitle>
            <Card className="space-y-5 p-card-padding">
              {[
                ['speed', 'Processing Speed'],
                ['battery', 'Battery Optimization'],
                ['sensor', 'Sensor Sensitivity'],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-2 flex justify-between text-label-sm text-on-surface-variant">
                    <span>{label}</span><span>{draft.tuning[key]}%</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={draft.tuning[key]}
                    onChange={(event) => setTuning(key, Number(event.target.value))}
                    className="range-wrs w-full"
                  />
                </label>
              ))}
              <p className="text-label-sm text-outline">Tuning above standard limits requires the corresponding active package capability and is revalidated server-side.</p>
            </Card>
          </section>
        </>
      )}

      {tab === 'Colors' && (
        <section>
          <SectionTitle>Colour palettes</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {allPalettes.map((palette) => (
              <button
                type="button"
                key={palette.name}
                onClick={() => setDraft((current) => ({ ...current, palette: palette.name }))}
                className={`surface flex items-center gap-3 rounded-2xl p-4 text-left ${draft.palette === palette.name ? 'border-tertiary/50 bg-tertiary/5' : ''}`}
              >
                <span className="flex -space-x-2">
                  {palette.colors.map((color) => <span key={color} className="h-8 w-8 rounded-full border-2 border-background" style={{ background: color }} />)}
                </span>
                <span className="text-body-md text-on-surface">{palette.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === 'Voice' && (
        <section>
          <SectionTitle>Voice profile</SectionTitle>
          <div className="space-y-2">
            {voices.map((voice) => (
              <button
                type="button"
                key={voice.id}
                onClick={() => setDraft((current) => ({ ...current, voiceProfileId: voice.id }))}
                className={`surface flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left ${draft.voiceProfileId === voice.id ? 'border-tertiary/50 bg-tertiary/5' : ''}`}
              >
                <span>
                  <span className="block text-body-md text-on-surface">{voice.name}</span>
                  <span className="block text-label-sm text-outline">{voice.capability ? `Requires ${voice.capability}` : 'Standard capability'}</span>
                </span>
                <Icon name={draft.voiceProfileId === voice.id ? 'check_circle' : 'radio_button_unchecked'} className="text-tertiary" />
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === 'Traits' && (
        <section>
          <SectionTitle>Personality</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {personalities.map((personality) => (
              <button
                type="button"
                key={personality.name}
                onClick={() => setDraft((current) => ({ ...current, personality: personality.name }))}
                className={`surface rounded-2xl p-4 text-center ${draft.personality === personality.name ? 'border-primary/60 bg-primary-container/20' : ''}`}
              >
                <Icon name={personality.icon} className="mx-auto text-[26px] text-primary" />
                <span className="mt-2 block text-label-md text-on-surface">{personality.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {message && <p role="alert" className="rounded-xl border border-error/30 bg-error/10 p-3 text-label-sm text-error">{message}</p>}
      <Button full size="lg" icon="save" loading={saving} onClick={saveRobot}>Save Robot</Button>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
