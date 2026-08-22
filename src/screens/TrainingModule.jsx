import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import SecureFileUpload from '../components/data/SecureFileUpload.jsx'
import SensitiveCapture from '../components/data/SensitiveCapture.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure, GradIcon, Progress, SectionTitle, Toast, Toggle } from '../components/ui.jsx'
import { trainingModules, trainingTiles } from '../data/mock.js'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

const BIOMETRIC = new Set(['voice', 'movement', 'facial', 'image-labeling', 'video-labeling'])
const UPLOAD = new Set(['skill', 'custom', 'conversation'])

function DemoModule({ mod, slug, policy, isBiometric, isUpload }) {
  const [toast, setToast] = useState('')
  const [consent, setConsent] = useState(false)
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
          <SectionTitle>Sensitive capture demo</SectionTitle>
          <Card className="space-y-4 p-card-padding">
            <Badge t="outline">No live capture</Badge>
            <Toggle
              checked={consent}
              onChange={setConsent}
              label="Preview explicit consent"
              desc="Local UI preview only; no consent record or media stream is created."
            />
            <Button full disabled onClick={explain}>
              Recording unavailable in demo
            </Button>
          </Card>
        </section>
      )}

      {isUpload && (
        <section>
          <SectionTitle>File upload demo</SectionTitle>
          <Card className="space-y-4 p-card-padding">
            <Badge t="outline">No live upload</Badge>
            <Button full disabled onClick={explain}>
              Private upload unavailable in demo
            </Button>
          </Card>
        </section>
      )}

      {!isBiometric && !isUpload && (
        <section>
          <SectionTitle>Training workflow preview</SectionTitle>
          <Card className="p-card-padding">
            <p className="text-body-md text-on-surface-variant">This module is a non-authoritative preview.</p>
            <Button full className="mt-4" disabled={!policy.enabled} onClick={explain}>
              Preview only
            </Button>
          </Card>
        </section>
      )}
      <Disclosure icon="shield">Demo only. No media, files, consent evidence or rewards are persisted.</Disclosure>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}

export default function TrainingModule() {
  const { slug } = useParams()
  const mod = trainingTiles.find((item) => item.slug === slug) || trainingModules.find((item) => item.slug === slug)
  const biometricPolicy = getSensitiveActionPolicy('training.biometricSubmit')
  const uploadPolicy = getSensitiveActionPolicy('training.fileUpload')
  if (!mod) return <Navigate to="/training" replace />

  const isUpload = UPLOAD.has(slug)
  const isBiometric = BIOMETRIC.has(slug)
  const policy = isUpload ? uploadPolicy : biometricPolicy

  if (runtimeConfig.isDemo)
    return <DemoModule mod={mod} slug={slug} policy={policy} isBiometric={isBiometric} isUpload={isUpload} />

  if (!policy.authoritative) {
    return (
      <AppShell title="Training unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live training capture is unavailable"
          desc={policy.reason}
          action={<Button to="/training">Back to training</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell title={mod.title} subtitle="Consent and private-storage protected" back avatar={false}>
      <section>
        <Card className="flex items-center gap-4 p-card-padding">
          <GradIcon icon={mod.icon} from={mod.from || '#2d5bff'} to={mod.to || '#6f00be'} size={56} radius={18} />
          <div className="min-w-0 flex-1">
            <p className="text-body-md text-on-surface">{mod.desc}</p>
            <p className="mt-2 text-label-sm text-outline">
              Progress/rewards are not awarded at upload time. Data must pass scanning and server review first.
            </p>
          </div>
        </Card>
      </section>

      {isBiometric && (
        <section>
          <SectionTitle>Consent-first capture</SectionTitle>
          <SensitiveCapture slug={slug} />
        </section>
      )}

      {isUpload && (
        <section>
          <SectionTitle>Private file upload</SectionTitle>
          <SecureFileUpload slug={slug} />
        </section>
      )}

      {!isBiometric && !isUpload && (
        <StateView
          kind="locked"
          title="This training module is not yet a data-capture workflow"
          desc="Only modules with an explicit capture or private-upload contract can submit data."
        />
      )}

      <Disclosure icon="verified_user">
        Personalization, dataset contribution and research/licensing are separate consent purposes. Granting one never
        authorizes another, and withdrawing the active purpose blocks new processing.
      </Disclosure>
    </AppShell>
  )
}
