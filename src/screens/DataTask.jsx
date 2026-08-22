import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import {
  Badge,
  Button,
  Card,
  Disclosure,
  Icon,
  Progress,
  SectionTitle,
  Toast,
  tone,
  IconTile,
} from '../components/ui.jsx'
import { dataTasks } from '../data/mock.js'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

export default function DataTask() {
  const { slug } = useParams()
  const task = dataTasks.find((t) => t.slug === slug)
  const policy = getSensitiveActionPolicy('data.taskSubmit')
  const [accepted, setAccepted] = useState(false)
  const [toast, setToast] = useState('')
  if (!task) return <Navigate to="/data" replace />

  if (!runtimeConfig.isDemo && !policy.authoritative) {
    return (
      <AppShell title="Data task unavailable" back avatar={false}>
        <StateView
          kind="locked"
          title="Live data tasks are not connected"
          desc="WRS hides mock tasks outside demo mode and will not accept submissions until the authoritative data service, consent records and review pipeline are live."
          action={<Button to="/data">Back to data center</Button>}
        />
      </AppShell>
    )
  }

  const c = tone(task.tone)
  const fire = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }
  const submit = () =>
    policy.enabled ? fire('Demo task preview — no data was uploaded, reviewed or rewarded') : fire(policy.reason)

  return (
    <AppShell title={`${task.title} demo`} back avatar={false}>
      <section>
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
      </section>

      <section>
        <SectionTitle>Illustrative task information</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Task category', task.cat],
            ['Estimated completion', task.time],
            ['Required language', 'English or Yoruba'],
            ['Reward type', 'Demo XP + contribution credit'],
            ['Submission deadline', 'Not scheduled — demo'],
            ['Quality requirement', 'Illustrative score ≥ 85%'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-right text-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>

      {accepted && (
        <section>
          <SectionTitle action="Demo 3 of 10">Preview progress</SectionTitle>
          <Card className="p-card-padding">
            <Progress value={30} />
            <div className="mt-4 space-y-2">
              {['Sample 1 previewed', 'Sample 2 previewed', 'Sample 3 in progress'].map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <Icon
                    name={i < 2 ? 'check_circle' : 'radio_button_checked'}
                    className={i < 2 ? 'text-tertiary text-[18px]' : 'text-primary text-[18px]'}
                  />
                  <span className="text-body-md text-on-surface-variant">{s}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {!accepted ? (
          <Button full size="lg" className="sm:col-span-2" onClick={() => setAccepted(true)}>
            Preview task
          </Button>
        ) : (
          <>
            <Button variant="ghost" full icon="save" onClick={() => fire('Demo draft only — nothing was saved')}>
              Preview save
            </Button>
            <Button
              variant="ghost"
              full
              icon="flag"
              onClick={() => fire('Demo report only — no support case was created')}
            >
              Preview report
            </Button>
            <Button full className="sm:col-span-2" icon="visibility" disabled={!policy.enabled} onClick={submit}>
              Preview submission
            </Button>
          </>
        )}
      </div>

      <Disclosure icon="verified_user">
        Demo only. Production submissions require explicit consent, authenticated storage and a real review lifecycle
        before rewards can be issued.
      </Disclosure>
      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
