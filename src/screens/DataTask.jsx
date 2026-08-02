import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Disclosure, Icon, Progress, SectionTitle, Toast, tone, IconTile } from '../components/ui.jsx'
import { dataTasks } from '../data/mock.js'

export default function DataTask() {
  const { slug } = useParams()
  const task = dataTasks.find((t) => t.slug === slug)
  const [accepted, setAccepted] = useState(false)
  const [toast, setToast] = useState('')
  if (!task) return <Navigate to="/data" replace />

  const c = tone(task.tone)
  const fire = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <AppShell title={task.title} back avatar={false}>
      <section>
        <Card className="p-card-padding">
          <div className="flex items-start gap-4">
            <IconTile icon={task.icon} accent={c.accent} size={56} radius={12} iconSize={26} />
            <div className="min-w-0 flex-1">
              <h2 className="font-headline-md text-headline-md text-on-surface">{task.title}</h2>
              <p className="text-label-sm text-outline">{task.cat}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge t={task.tone}>+{task.xp} XP</Badge>
                <Badge t="outline">{task.time}</Badge>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Task information</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['Task category', task.cat],
            ['Estimated completion', task.time],
            ['Required language', 'English or Yoruba'],
            ['Required skills', 'Clear audio environment'],
            ['Reward type', 'XP + contribution credit'],
            ['XP value', `${task.xp} XP`],
            ['Submission deadline', '31 Aug 2025'],
            ['Quality requirement', 'Score ≥ 85%'],
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
          <SectionTitle action="3 of 10">Progress</SectionTitle>
          <Card className="p-card-padding">
            <Progress value={30} />
            <div className="mt-4 space-y-2">
              {['Sample 1 submitted', 'Sample 2 submitted', 'Sample 3 in progress'].map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <Icon
                    name={i < 2 ? 'check_circle' : 'radio_button_checked'}
                    className={i < 2 ? 'text-tertiary text-[18px]' : 'text-primary text-[18px]'}
                    fill={i < 2}
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
            Accept Task
          </Button>
        ) : (
          <>
            <Button variant="ghost" full icon="save" onClick={() => fire('Draft saved')}>
              Save Draft
            </Button>
            <Button variant="ghost" full icon="flag" onClick={() => fire('Problem reported')}>
              Report Problem
            </Button>
            <Button full className="sm:col-span-2" icon="send" onClick={() => fire('Task submitted for review')}>
              Submit Task
            </Button>
          </>
        )}
      </div>

      <Disclosure icon="verified_user">
        Only data you intentionally contribute and authorize is used. Approved contributions may qualify for platform
        rewards under the relevant program.
      </Disclosure>

      <Toast show={!!toast} message={toast} />
    </AppShell>
  )
}
