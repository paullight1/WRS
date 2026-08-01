import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import {
  Badge, Button, Card, Chip, Disclosure, Icon, Progress, SectionTitle, Stat, Toast, Toggle, tone,
} from '../components/ui.jsx'
import { trainingModules, languages } from '../data/mock.js'

/* ------------------------------------------------------------------- voice */
function VoiceTraining({ onSubmit }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [lang, setLang] = useState('English')

  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [recording])

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <>
      <section>
        <Card className="flex flex-col items-center p-card-padding">
          <p className="text-label-sm font-label-sm uppercase tracking-widest text-outline">Read the prompt aloud</p>
          <p className="mt-3 text-center font-headline-md text-[19px] leading-relaxed text-on-surface">
            "Good morning. Please prepare the delivery manifest for aisle four."
          </p>

          <div className="relative my-8 grid place-items-center">
            <span
              className={`absolute h-32 w-32 rounded-full bg-tertiary/20 blur-2xl ${recording ? 'animate-breathe' : 'opacity-30'}`}
            />
            <button
              onClick={() => setRecording(!recording)}
              className={`relative grid h-24 w-24 place-items-center rounded-full transition-all active:scale-95 ${
                recording ? 'bg-error/20 border-2 border-error' : 'grad-primary glow-primary'
              }`}
            >
              <Icon name={recording ? 'stop' : 'mic'} className="text-[36px] text-white" fill />
            </button>
          </div>

          <p className="font-label-md text-[24px] tracking-widest text-tertiary">{mmss}</p>
          <p className="mt-1 text-label-sm font-label-sm text-outline">
            {recording ? 'Recording — speak clearly' : 'Tap to start recording'}
          </p>

          {/* waveform */}
          <div className="mt-6 flex h-12 w-full items-end justify-center gap-1">
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-tertiary/70 transition-all duration-300"
                style={{
                  height: recording ? `${20 + Math.abs(Math.sin((i + seconds) / 2)) * 80}%` : '12%',
                  opacity: recording ? 0.4 + Math.abs(Math.sin((i + seconds) / 3)) * 0.6 : 0.25,
                }}
              />
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Language</SectionTitle>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['English', 'Yoruba', 'Hausa', 'Igbo', 'Swahili', 'French'].map((l) => (
            <Chip key={l} active={lang === l} onClick={() => setLang(l)}>
              {l}
            </Chip>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Audio quality" value="High" t="tertiary" icon="graphic_eq" />
        <Stat label="Accepted" value="34" t="success" icon="check_circle" />
        <Stat label="Rejected" value="2" t="error" icon="cancel" />
      </section>

      <section>
        <SectionTitle>Activities</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['Speak a sentence', 'done'],
            ['Read a story', 'done'],
            ['Record commands', 'active'],
            ['Record greetings', 'todo'],
            ['Record local expressions', 'todo'],
            ['Record industry vocabulary', 'todo'],
            ['Validate pronunciation', 'todo'],
          ].map(([label, state]) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3.5">
              <Icon
                name={state === 'done' ? 'check_circle' : state === 'active' ? 'radio_button_checked' : 'circle'}
                className={`text-[20px] ${
                  state === 'done' ? 'text-tertiary' : state === 'active' ? 'text-primary' : 'text-outline/40'
                }`}
                fill={state === 'done'}
              />
              <span className="flex-1 text-body-md text-on-surface-variant">{label}</span>
            </div>
          ))}
        </Card>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="ghost" full icon="play_arrow">
          Play Recording
        </Button>
        <Button variant="ghost" full icon="refresh">
          Record Again
        </Button>
        <Button full icon="upload" className="sm:col-span-2" onClick={onSubmit}>
          Submit Sample
        </Button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- language */
function LanguageTraining({ onSubmit }) {
  const [sel, setSel] = useState('Yoruba')
  return (
    <>
      <section>
        <SectionTitle action="8 active">Language Categories</SectionTitle>
        <div className="space-y-2">
          {languages.map((l) => {
            const locked = l.level === 'Locked'
            return (
              <button
                key={l.name}
                disabled={locked}
                onClick={() => setSel(l.name)}
                className={`glass block w-full rounded-2xl p-4 text-left transition-all ${
                  sel === l.name ? 'border-tertiary/40 bg-tertiary/5' : ''
                } ${locked ? 'opacity-45' : 'hover:border-white/25'}`}
              >
                <div className="flex items-center gap-3">
                  <Icon name={locked ? 'lock' : 'translate'} className="text-[20px] text-primary" />
                  <span className="flex-1 text-body-md text-on-surface">{l.name}</span>
                  <span className="text-label-sm font-label-sm text-outline">{l.level}</span>
                </div>
                <Progress value={l.progress} className="mt-3" height="h-1.5" showShimmer={false} />
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Activities for {sel}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Translate words', 'g_translate'],
            ['Translate sentences', 'notes'],
            ['Record pronunciation', 'mic'],
            ['Validate meaning', 'fact_check'],
            ['Match audio to text', 'hearing'],
            ['Cultural context', 'diversity_3'],
          ].map(([label, icon]) => (
            <Card key={label} className="flex flex-col items-center gap-2 p-4 text-center">
              <Icon name={icon} className="text-[22px] text-tertiary" />
              <span className="text-label-sm font-label-sm text-on-surface-variant">{label}</span>
            </Card>
          ))}
        </div>
      </section>

      <Button full size="lg" onClick={onSubmit}>
        Begin Language Training
      </Button>
    </>
  )
}

/* ----------------------------------------------------------- capture-based */
function CaptureTraining({ kind, onSubmit }) {
  const isFace = kind === 'facial'
  const [consents, setConsents] = useState({ contribute: true, personal: true, research: false })
  const cats = isFace
    ? ['Neutral', 'Happy', 'Focused', 'Confused', 'Surprised', 'Attentive', 'Professional', 'Concerned']
    : ['Walking style', 'Hand movement', 'Greeting style', 'Sitting posture', 'Object handling', 'Work movement', 'Cultural gestures', 'Safety movements']

  return (
    <>
      <section>
        <Card className="relative grid aspect-video place-items-center overflow-hidden p-card-padding">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-container/10 to-transparent" />
          <div className="absolute inset-x-6 top-0 h-[2px] animate-scan bg-tertiary/60 shadow-[0_0_12px_#00dbe7]" />
          <div className="absolute inset-6 rounded-xl border border-dashed border-tertiary/30" />
          <div className="relative text-center">
            <Icon name={isFace ? 'face' : 'directions_walk'} className="text-[54px] text-tertiary/70" />
            <p className="mt-2 text-label-sm font-label-sm text-outline">
              {isFace ? 'Align your face inside the frame' : 'Ensure full-body visibility'}
            </p>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Categories</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <span
              key={c}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-label-sm font-label-sm text-on-surface-variant"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Consent controls</SectionTitle>
        <div className="space-y-2">
          <Toggle
            checked={consents.contribute}
            onChange={(v) => setConsents({ ...consents, contribute: v })}
            label={`Allow ${isFace ? 'facial' : 'movement'} data contribution`}
            desc="Required to submit this training type"
          />
          <Toggle
            checked={consents.personal}
            onChange={(v) => setConsents({ ...consents, personal: v })}
            label="Use only for my personal robot"
            desc="Data stays attached to your robot profile"
          />
          <Toggle
            checked={consents.research}
            onChange={(v) => setConsents({ ...consents, research: v })}
            label="Allow anonymized research use"
            desc="Optional — may qualify for revenue participation"
          />
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="ghost" full icon="videocam">
          Start Capture
        </Button>
        <Button variant="ghost" full icon="visibility">
          Review Capture
        </Button>
        <Button full icon="upload" className="sm:col-span-2" disabled={!consents.contribute} onClick={onSubmit}>
          Submit Training Data
        </Button>
      </div>

      <Disclosure icon="shield">
        Biometric, facial, voice and movement data require explicit consent. You can delete uploaded data at any time
        from Settings → Data consent.
      </Disclosure>
    </>
  )
}

/* ------------------------------------------------------------------ upload */
function UploadTraining({ onSubmit }) {
  return (
    <>
      <section>
        <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <Icon name="cloud_upload" className="text-[30px] text-primary" />
          </span>
          <p className="font-headline-md text-[17px] text-on-surface">Drop files or browse</p>
          <p className="max-w-xs text-body-md text-outline">
            Workflows, procedures, product knowledge, documents. PDF, DOCX, CSV, TXT up to 50 MB.
          </p>
          <Button variant="tonal" size="sm" icon="folder_open">
            Browse files
          </Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Recently uploaded</SectionTitle>
        <Card className="divide-y divide-white/5">
          {[
            ['Warehouse SOP v3.pdf', 'Approved', 'tertiary'],
            ['Customer greeting script.docx', 'In review', 'primary'],
            ['Inventory codes.csv', 'Approved', 'tertiary'],
          ].map(([name, state, t]) => (
            <div key={name} className="flex items-center gap-3 px-5 py-3.5">
              <Icon name="description" className="text-outline" />
              <span className="min-w-0 flex-1 truncate text-body-md text-on-surface-variant">{name}</span>
              <Badge t={t}>{state}</Badge>
            </div>
          ))}
        </Card>
      </section>

      <Button full size="lg" icon="upload" onClick={onSubmit}>
        Submit for review
      </Button>
    </>
  )
}

/* ------------------------------------------------------------------- shell */
export default function TrainingModule() {
  const { slug } = useParams()
  const mod = trainingModules.find((m) => m.slug === slug)
  const [toast, setToast] = useState(false)
  if (!mod) return <Navigate to="/training" replace />

  const submit = () => {
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }

  const c = tone(mod.tone)

  return (
    <AppShell title={mod.title} back avatar={false}>
      <section>
        <Card className="flex items-center gap-4 p-card-padding">
          <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border ${c.bg} ${c.border}`}>
            <Icon name={mod.icon} className={`${c.text} text-[26px]`} fill />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-md text-on-surface">{mod.desc}</p>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={mod.progress} height="h-1.5" />
              <span className={`shrink-0 text-label-sm font-label-sm ${c.text}`}>{mod.progress}%</span>
            </div>
          </div>
        </Card>
      </section>

      {slug === 'voice' && <VoiceTraining onSubmit={submit} />}
      {slug === 'language' && <LanguageTraining onSubmit={submit} />}
      {(slug === 'movement' || slug === 'facial') && <CaptureTraining kind={slug} onSubmit={submit} />}
      {(slug === 'skill' || slug === 'custom') && <UploadTraining onSubmit={submit} />}

      <Toast show={toast} message="Training data submitted for review" />
    </AppShell>
  )
}
