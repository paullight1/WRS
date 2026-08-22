import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure, GradIcon, Progress, SectionTitle, Toast, Toggle } from '../components/ui.jsx'
import { trainingModules, trainingTiles } from '../data/mock.js'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

const BIOMETRIC = new Set(['voice', 'movement', 'facial', 'image-labeling', 'video-labeling'])
const UPLOAD = new Set(['skill', 'custom', 'conversation'])

export default function TrainingModule() {
  const { slug } = useParams()
  const mod = trainingTiles.find((m) => m.slug === slug) || trainingModules.find((m) => m.slug === slug)
  const biometricPolicy = getSensitiveActionPolicy('training.biometricSubmit')
  const uploadPolicy = getSensitiveActionPolicy('training.fileUpload')
  const [toast, setToast] = useState('')
  const [consent, setConsent] = useState(false)

  if (!mod) return <Navigate to="/training" replace />

  const isUpload = UPLOAD.has(slug)
  const isBiometric = BIOMETRIC.has(slug)
  const policy = isUpload ? uploadPolicy : biometricPolicy

  if (!runtimeConfig.isDemo && !policy.authoritative) {
    return (
      <AppShell title="Training unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live training capture is not connected"
          desc="WRS will not access microphones, cameras, biometric captures or files until authoritative consent, storage, deletion and review services are live."
          action={<Button to="/training">Back to training</Button>}
        />
      </AppShell>
    )
  }

  const explain = () => {
    setToast(policy.reason)
    setTimeout(() => setToast(''), 2800)
  }

  return (
    <AppShell title={`${mod.title} demo`} back avatar={false}>
      <section>
        <Card className="flex items-center gap-4 p-card-padding">
          <GradIcon icon={mod.icon} from={mod.from || '#2d5bff'} to={mod.to || '#6f00be'} size={56} radius={18} />
          <div className="min-w-0 flex-1">
            <p className="text-body-md text-on-surface">{mod.desc}</p>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={mod.progress} height="h-1.5" />
              <span className="shrink-0 text-label-sm text-tertiary">{mod.progress}% demo progress</span>
            </div>
          </div>
        </Card>
      </section>

      {isBiometric && (
        <section>
          <SectionTitle>Sensitive capture safety</SectionTitle>
          <Card className="space-y-4 p-card-padding">
            <Badge t="outline">Capture disabled in Plan 1</Badge>
            <p className="text-body-md text-on-surface-variant">
              The current product may preview the training workflow, but it does not request a microphone/camera stream
              or upload biometric data.
            </p>
            <Toggle
              checked={consent}
              onChange={setConsent}
              label="Preview explicit consent"
              desc="Local UI preview only; this is not stored or used as production consent."
            />
            <Button full icon="mic_off" disabled onClick={explain}>
              Recording unavailable
            </Button>
            <Button full icon="upload" disabled onClick={explain}>
              Biometric submission unavailable
            </Button>
          </Card>
        </section>
      )}

      {isUpload && (
        <section>
          <SectionTitle>File upload safety</SectionTitle>
          <Card className="space-y-4 p-card-padding">
            <Badge t="outline">Uploads disabled in Plan 1</Badge>
            <p className="text-body-md text-on-surface-variant">
              PDF, DOCX, CSV and other files are not accepted until signed uploads, MIME validation, malware scanning,
              private storage and deletion controls are implemented.
            </p>
            <Button full icon="folder_off" disabled onClick={explain}>
              File selection unavailable
            </Button>
            <Button full icon="upload" disabled onClick={explain}>
              Submission unavailable
            </Button>
          </Card>
        </section>
      )}

      {!isBiometric && !isUpload && (
        <section>
          <SectionTitle>Training workflow preview</SectionTitle>
          <Card className="p-card-padding">
            <p className="text-body-md text-on-surface-variant">
              This module is a non-authoritative preview. No training progress, data or reward is persisted.
            </p>
            <Button full className="mt-4" disabled={!policy.enabled} onClick={explain}>
              Preview only
            </Button>
          </Card>
        </section>
      )}

      <Disclosure icon="shield">
        Biometric, voice, movement and uploaded data remain blocked until explicit server-side consent provenance,
        secure storage, deletion and audit evidence exist.
      </Disclosure>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
