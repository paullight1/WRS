import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure, IconTile, SectionTitle, Toast, tone } from '../components/ui.jsx'
import { dataTasks } from '../data/mock.js'
import { browserDataClient } from '../infrastructure/data/browserDataClient.ts'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

function categoryFor(slug) {
  const value = slug.toLowerCase()
  if (value.includes('voice') || value.includes('speech') || value.includes('transcription')) return 'voice'
  if (value.includes('image')) return 'image'
  if (value.includes('video')) return 'video'
  if (value.includes('conversation')) return 'conversation'
  return 'text'
}

function DemoTask({ task }) {
  const [accepted, setAccepted] = useState(false)
  const [toast, setToast] = useState('')
  const c = tone(task.tone)
  const fire = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 2400)
  }
  return (
    <AppShell title={`${task.title} demo`} back avatar={false}>
      <Card className="p-card-padding">
        <div className="flex items-start gap-4">
          <IconTile icon={task.icon} accent={c.accent} size={56} radius={12} iconSize={26} />
          <div className="min-w-0 flex-1">
            <h2 className="font-headline-md text-headline-md text-on-surface">{task.title}</h2>
            <p className="text-label-sm text-outline">{task.cat} · demo task</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge t="outline">+{task.xp} demo XP</Badge>
              <Badge t="outline">{task.time}</Badge>
            </div>
          </div>
        </div>
      </Card>
      <Button full size="lg" onClick={() => setAccepted(true)}>
        {accepted ? 'Task preview opened' : 'Preview task'}
      </Button>
      {accepted && (
        <Button full icon="visibility" onClick={() => fire('Demo only — no submission, review or XP was created')}>
          Preview submission
        </Button>
      )}
      <Disclosure icon="verified_user">
        Demo only. Production submissions require purpose-specific consent and server review.
      </Disclosure>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}

function LiveTask({ task, slug }) {
  const category = categoryFor(slug)
  const [consented, setConsented] = useState(false)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const grantConsent = async () => {
    setBusy(true)
    setMessage('')
    try {
      await browserDataClient.recordConsent({
        purposeSlug: 'dataset-contribution',
        policyVersion: 1,
        dataCategory: category,
        action: 'granted',
        context: { surface: 'data-task', taskSlug: slug },
      })
      setConsented(true)
      setMessage('Dataset-contribution consent recorded for this task category.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Consent could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!consented || !answer.trim()) return
    setBusy(true)
    setMessage('')
    try {
      const result = await browserDataClient.submitTask(slug, { answer: answer.trim(), taskTitle: task.title })
      setAnswer('')
      setMessage(`Response ${result.responseId} submitted for review. No XP or approval has been issued yet.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Task response could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  const c = tone(task.tone)
  return (
    <AppShell title={task.title} subtitle="Consent and review protected" back avatar={false}>
      <Card className="p-card-padding">
        <div className="flex items-start gap-4">
          <IconTile icon={task.icon} accent={c.accent} size={56} radius={12} iconSize={26} />
          <div className="min-w-0 flex-1">
            <h2 className="font-headline-md text-headline-md text-on-surface">{task.title}</h2>
            <p className="text-label-sm text-outline">
              {task.cat} · {category}
            </p>
          </div>
        </div>
      </Card>

      <section>
        <SectionTitle>Contribution consent</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <p className="text-body-md text-on-surface-variant">
            This task contributes to WRS review/training only. Research/commercial licensing remains a separate consent
            purpose.
          </p>
          <Button loading={busy} disabled={consented} onClick={grantConsent}>
            {consented ? 'Consent recorded' : 'Grant contribution consent'}
          </Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Your response</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={7}
            maxLength={5000}
            disabled={!consented || busy}
            aria-label="Data task response"
            placeholder="Enter the response requested by this task."
            className="w-full resize-y rounded-xl border border-outline-variant bg-black/20 px-4 py-3 text-body-md text-on-surface outline-none"
          />
          <Button full loading={busy} disabled={!consented || !answer.trim()} onClick={submit}>
            Submit for review
          </Button>
        </Card>
      </section>

      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
      <Disclosure icon="shield">
        Submission is not approval. Server review determines quality; later plans may award rewards only from a verified
        approved event.
      </Disclosure>
    </AppShell>
  )
}

export default function DataTask() {
  const { slug } = useParams()
  const task = dataTasks.find((item) => item.slug === slug)
  const policy = getSensitiveActionPolicy('data.taskSubmit')
  if (!task) return <Navigate to="/data" replace />
  if (runtimeConfig.isDemo) return <DemoTask task={task} />
  if (!policy.authoritative) {
    return (
      <AppShell title="Data task unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live data tasks are unavailable"
          desc={policy.reason}
          action={<Button to="/data">Back to data center</Button>}
        />
      </AppShell>
    )
  }
  return <LiveTask task={task} slug={slug} />
}
