import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Disclosure, GradIcon, SectionTitle } from '../components/ui.jsx'
import { trainingModules, trainingTiles } from '../data/mock.js'
import { browserDataClient } from '../infrastructure/data/browserDataClient.ts'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

const CONTRIBUTION_TASKS = {
  voice: {
    category: 'voice',
    fields: [
      { id: 'locale', label: 'Language or locale', placeholder: 'For example, Yoruba (yo-NG)' },
      {
        id: 'phrase',
        label: 'Voice phrase and pronunciation notes',
        placeholder: 'Enter a phrase and describe how it should sound.',
      },
    ],
  },
  language: {
    category: 'text',
    fields: [
      { id: 'language', label: 'Language', placeholder: 'For example, Yoruba' },
      { id: 'phrase', label: 'Phrase in the original language', placeholder: 'Enter the source phrase.' },
      {
        id: 'translation',
        label: 'Translation and pronunciation notes',
        placeholder: 'Enter a natural translation and any useful notes.',
      },
    ],
  },
  skill: {
    category: 'document',
    fields: [
      { id: 'skill', label: 'Skill to teach', placeholder: 'Name a robot skill or workflow.' },
      { id: 'instructions', label: 'Steps', placeholder: 'Describe the steps in order.' },
      {
        id: 'expectedResult',
        label: 'Expected result',
        placeholder: 'Describe how the robot should know the task is complete.',
      },
    ],
  },
  movement: {
    category: 'movement',
    fields: [
      { id: 'movement', label: 'Movement or gesture', placeholder: 'Name the movement.' },
      {
        id: 'description',
        label: 'Movement instructions and safety notes',
        placeholder: 'Describe the motion, start/end position, and any safety limits.',
      },
    ],
  },
  facial: {
    category: 'face',
    fields: [
      { id: 'expression', label: 'Expression label', placeholder: 'For example, happy, confused, or attentive' },
      {
        id: 'description',
        label: 'Visible cues and context',
        placeholder: 'Describe the cues and when the robot should use this expression.',
      },
    ],
  },
  'image-labeling': {
    category: 'image',
    fields: [
      { id: 'labels', label: 'Object or scene labels', placeholder: 'List the labels, separated by commas.' },
      {
        id: 'description',
        label: 'Labeling notes',
        placeholder: 'Describe the scene or explain how the labels apply.',
      },
    ],
  },
  'video-labeling': {
    category: 'video',
    fields: [
      { id: 'action', label: 'Action label', placeholder: 'Name the action shown.' },
      {
        id: 'description',
        label: 'Action sequence and timing',
        placeholder: 'Describe what happens in order and any important timing.',
      },
    ],
  },
  'text-translation': {
    category: 'text',
    fields: [
      { id: 'sourceLanguage', label: 'Source language', placeholder: 'Language of the original text' },
      { id: 'targetLanguage', label: 'Target language', placeholder: 'Language of your translation' },
      { id: 'sourceText', label: 'Original text', placeholder: 'Enter the text to translate.' },
      { id: 'translatedText', label: 'Translation', placeholder: 'Enter your translation.' },
    ],
  },
  conversation: {
    category: 'conversation',
    fields: [
      { id: 'userMessage', label: 'User message', placeholder: 'Enter a realistic user request.' },
      {
        id: 'robotReply',
        label: 'Helpful robot response',
        placeholder: 'Write the response a safe, useful robot should give.',
      },
      {
        id: 'context',
        label: 'Context or safety notes',
        placeholder: 'Add any relevant setting, constraints, or safety considerations.',
      },
    ],
  },
  custom: {
    category: 'document',
    fields: [
      {
        id: 'dataType',
        label: 'Type of training example',
        placeholder: 'For example, local names, objects, or a work procedure',
      },
      {
        id: 'description',
        label: 'What should this teach the robot?',
        placeholder: 'Describe the task or knowledge area.',
      },
      { id: 'sample', label: 'Example data', placeholder: 'Provide one useful example.' },
    ],
  },
}

function taskKey(slug) {
  return `training-${slug}`
}

function submissionStatus(status) {
  if (status === 'approved') return { label: 'Approved', tone: 'tertiary' }
  if (status === 'rejected') return { label: 'Needs revision', tone: 'error' }
  if (status === 'review') return { label: 'In review', tone: 'gold' }
  return { label: 'Submitted', tone: 'outline' }
}

function DemoModule({ mod }) {
  return (
    <AppShell title={mod.title} subtitle="Training contribution" back avatar={false}>
      <Card className="p-card-padding">
        <h2 className="text-title font-semibold text-on-surface">Live contribution required</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Demo mode does not store training responses or award XP. Sign in to a connected WRS account to contribute data
          for review.
        </p>
        <Button to="/login" full className="mt-4">
          Sign in
        </Button>
      </Card>
    </AppShell>
  )
}

function LiveTrainingTask({ mod, slug, task }) {
  const [consented, setConsented] = useState(false)
  const [values, setValues] = useState(() => Object.fromEntries(task.fields.map((field) => [field.id, ''])))
  const [responses, setResponses] = useState([])
  const [loadingResponses, setLoadingResponses] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const refreshResponses = async ({ quiet = false } = {}) => {
    if (!quiet) setRefreshing(true)
    try {
      const result = await browserDataClient.taskResponses(taskKey(slug))
      setResponses(result.responses)
      setMessage('')
    } catch (error) {
      if (!quiet) setMessage(error instanceof Error ? error.message : 'Training history could not be loaded.')
    } finally {
      setLoadingResponses(false)
      if (!quiet) setRefreshing(false)
    }
  }

  useEffect(() => {
    let active = true
    browserDataClient
      .taskResponses(taskKey(slug))
      .then(
        (result) => {
          if (active) setResponses(result.responses)
        },
        (error) => {
          if (active) setMessage(error instanceof Error ? error.message : 'Training history could not be loaded.')
        },
      )
      .finally(() => {
        if (active) setLoadingResponses(false)
      })
    return () => {
      active = false
    }
  }, [slug])

  const grantConsent = async () => {
    setBusy(true)
    setMessage('')
    try {
      await browserDataClient.recordConsent({
        purposeSlug: 'dataset-contribution',
        policyVersion: 1,
        dataCategory: task.category,
        action: 'granted',
        context: { surface: 'ai-training', module: slug },
      })
      setConsented(true)
      setMessage('Contribution consent is active for this training category.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Consent could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  const withdrawConsent = async () => {
    setBusy(true)
    setMessage('')
    try {
      await browserDataClient.recordConsent({
        purposeSlug: 'dataset-contribution',
        policyVersion: 1,
        dataCategory: task.category,
        action: 'withdrawn',
        context: { surface: 'ai-training', module: slug },
      })
      setConsented(false)
      setMessage('Contribution consent withdrawn. New submissions and approvals are blocked for this category.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Consent could not be withdrawn.')
    } finally {
      setBusy(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!consented || busy || task.fields.some((field) => !values[field.id].trim())) return
    setBusy(true)
    setMessage('')
    try {
      const result = await browserDataClient.submitTask(taskKey(slug), values)
      setValues(Object.fromEntries(task.fields.map((field) => [field.id, ''])))
      setMessage(`Contribution ${result.responseId} submitted. XP is awarded only after approval.`)
      await refreshResponses({ quiet: true })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Training contribution could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title={mod.title} subtitle="Submit a training contribution" back avatar={false}>
      <Card className="flex items-center gap-4 p-card-padding">
        <GradIcon icon={mod.icon} from={mod.from || '#2d5bff'} to={mod.to || '#6f00be'} size={56} radius={18} />
        <div className="min-w-0 flex-1">
          <h2 className="text-title font-semibold text-on-surface">Contribute a {mod.title.toLowerCase()} example</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Your response is sent to WRS for human review. XP appears here only after the server approves it.
          </p>
        </div>
      </Card>

      <section>
        <SectionTitle>Contribution consent</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <p className="text-body-sm text-on-surface-variant">
            Dataset contribution lets WRS review this example for robot training. Research or commercial licensing uses
            separate consent. You can withdraw this category&apos;s consent here.
          </p>
          {consented ? (
            <Button variant="ghost" loading={busy} disabled={busy} onClick={withdrawConsent}>
              Withdraw consent
            </Button>
          ) : (
            <Button loading={busy} disabled={busy} onClick={grantConsent}>
              Grant training contribution consent
            </Button>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Your training example</SectionTitle>
        <Card className="p-card-padding">
          <form className="space-y-4" onSubmit={submit}>
            {task.fields.map((field) => (
              <label key={field.id} className="block text-label-md text-on-surface">
                {field.label}
                <textarea
                  value={values[field.id]}
                  onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                  rows={
                    field.id.toLowerCase().includes('text') || field.id === 'description' || field.id === 'phrase'
                      ? 4
                      : 2
                  }
                  maxLength={5000}
                  disabled={!consented || busy}
                  required
                  placeholder={field.placeholder}
                  className="mt-1.5 w-full resize-y rounded-xl border border-white/12 bg-surface-container px-3.5 py-3 text-body-md text-on-surface outline-none placeholder:text-outline focus:border-primary disabled:opacity-55"
                />
              </label>
            ))}
            <Button
              full
              type="submit"
              loading={busy}
              disabled={!consented || busy || task.fields.some((field) => !values[field.id].trim())}
              icon="upload"
            >
              Submit for review
            </Button>
          </form>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">Your submissions</h2>
          <button
            type="button"
            className="shrink-0 text-label-md text-primary disabled:opacity-55"
            onClick={() => refreshResponses()}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {loadingResponses ? (
          <p role="status" className="text-body-sm text-on-surface-variant">
            Loading your training history…
          </p>
        ) : responses.length ? (
          <div className="space-y-2">
            {responses.map((response) => {
              const status = submissionStatus(response.status)
              return (
                <Card key={response.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-label-md text-on-surface">
                      Submitted {new Date(response.submittedAt).toLocaleString()}
                    </p>
                    {response.qualityScore !== null && (
                      <p className="mt-1 text-label-sm text-on-surface-variant">
                        Review score: {response.qualityScore}%
                      </p>
                    )}
                  </div>
                  <Badge t={status.tone}>{status.label}</Badge>
                  {response.xpAwarded > 0 && <Badge t="tertiary">+{response.xpAwarded} XP</Badge>}
                  {response.status === 'approved' && response.xpAwarded === 0 && (
                    <Badge t="outline">No XP posted</Badge>
                  )}
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="p-4 text-body-sm text-on-surface-variant">
            No contributions yet. Your XP and review status will appear here.
          </Card>
        )}
      </section>

      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
      <Disclosure icon="verified_user">
        Submitting does not grant XP. A trusted reviewer must approve your response, and the active WRS reward rule
        determines whether and how much XP is issued.
      </Disclosure>
    </AppShell>
  )
}

export default function TrainingModule() {
  const { slug } = useParams()
  const mod = trainingTiles.find((item) => item.slug === slug) || trainingModules.find((item) => item.slug === slug)
  const task = CONTRIBUTION_TASKS[slug]
  const policy = getSensitiveActionPolicy('data.taskSubmit')
  if (!mod || !task) return <Navigate to="/training" replace />
  if (runtimeConfig.isDemo) return <DemoModule mod={mod} />

  if (!policy.authoritative) {
    return (
      <AppShell title="Training unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live training contributions are unavailable"
          desc={policy.reason}
          action={<Button to="/training">Back to training</Button>}
        />
      </AppShell>
    )
  }

  return <LiveTrainingTask mod={mod} slug={slug} task={task} />
}
