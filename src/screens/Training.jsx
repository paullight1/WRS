import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, Card, GradIcon, Icon, SectionTitle, Tabs, Toast } from '../components/ui.jsx'
import { trainingTiles } from '../data/mock.js'
import { browserDataClient } from '../infrastructure/data/browserDataClient.ts'
import { runtimeConfig } from '../lib/runtimeConfig.js'
import { getSensitiveActionPolicy } from '../lib/sensitiveActions.js'

/* Colourful launcher tile — the core of the training grid. */
function TrainingTile({ t, onLockedClick }) {
  return (
    <button
      type="button"
      onClick={() => onLockedClick(t.title)}
      aria-label={`${t.title}, locked. Coming soon.`}
      className="surface group relative flex w-full flex-col items-center gap-2 overflow-hidden rounded-2xl px-2.5 py-5 text-center transition-all hover:border-white/25 active:scale-[.97]"
    >
      <span
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/20 text-on-surface-variant"
        aria-hidden="true"
      >
        <Icon name="lock" className="text-[15px]" />
      </span>
      <GradIcon
        icon={t.icon}
        from={t.from}
        to={t.to}
        size={54}
        radius={18}
        className="relative opacity-70 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105"
      />
      <span className="relative mt-1 block text-[13px] font-medium leading-tight text-on-surface">{t.title}</span>
    </button>
  )
}

export default function Training() {
  const [tab, setTab] = useState('Train')
  const [responses, setResponses] = useState([])
  const [responseState, setResponseState] = useState('loading')
  const [lockedNotice, setLockedNotice] = useState('')
  const dataPolicy = getSensitiveActionPolicy('data.taskSubmit')

  const showLockedNotice = (title) => {
    setLockedNotice(`${title} is coming soon — keep mining.`)
    window.setTimeout(() => setLockedNotice(''), 2600)
  }

  useEffect(() => {
    let active = true
    if (runtimeConfig.isDemo || !dataPolicy.authoritative) {
      queueMicrotask(() => {
        if (!active) return
        setResponseState(runtimeConfig.isDemo ? 'demo' : 'unavailable')
      })
      return () => {
        active = false
      }
    }
    browserDataClient.taskResponses().then(
      (result) => {
        if (!active) return
        setResponses(result.responses.filter((response) => response.taskSlug.startsWith('training-')))
        setResponseState('ready')
      },
      () => {
        if (active) setResponseState('unavailable')
      },
    )
    return () => {
      active = false
    }
  }, [dataPolicy.authoritative])

  const totalXp = responses.reduce((total, response) => total + response.xpAwarded, 0)
  const approved = responses.filter((response) => response.status === 'approved').length
  const pending = responses.filter((response) => ['submitted', 'review'].includes(response.status)).length
  const rejected = responses.filter((response) => response.status === 'rejected').length

  return (
    <AppShell title="AI Training Center" subtitle="Train your robot with your data" back avatar={false}>
      <Tabs items={['Train', 'Data Tasks']} value={tab} onChange={setTab} />

      {tab === 'Train' ? (
        <>
          {/* ------------------------------------------------- colourful grid */}
          <section>
            <div className="grid grid-cols-3 gap-3">
              {trainingTiles.map((t) => (
                <TrainingTile key={t.slug} t={t} onLockedClick={showLockedNotice} />
              ))}
            </div>
          </section>

          {/* ------------------------------------------------- contributions */}
          <section>
            <Card className="relative overflow-hidden p-card-padding">
              <div className="relative flex items-center gap-4">
                <GradIcon icon="workspace_premium" from="#57c9ff" to="#1f6fd0" size={52} radius={16} />
                <div className="min-w-0 flex-1">
                  <p className="text-title font-semibold text-on-surface">Your Contributions</p>
                  <p className="text-label-md text-success">
                    {responseState === 'ready'
                      ? `${totalXp.toLocaleString()} XP awarded`
                      : responseState === 'loading'
                        ? 'Loading verified progress…'
                        : 'Verified progress unavailable'}
                  </p>
                </div>
                <Button to="/rewards" size="sm">
                  XP details
                </Button>
              </div>

              <div className="relative mt-5 grid grid-cols-3 gap-3 border-t border-white/8 pt-4 text-center">
                {[
                  ['Submitted', responseState === 'ready' ? responses.length : '—'],
                  ['Approved', responseState === 'ready' ? approved : '—'],
                  ['Pending review', responseState === 'ready' ? pending : '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-title font-bold text-on-surface">{v}</p>
                    <p className="text-label-sm text-outline">{k}</p>
                  </div>
                ))}
              </div>
              {responseState === 'ready' && rejected > 0 && (
                <p className="relative mt-3 text-label-sm text-on-surface-variant">
                  {rejected} response{rejected === 1 ? '' : 's'} need revision. Open a module to review status.
                </p>
              )}
              {responseState === 'demo' && (
                <p className="relative mt-3 text-label-sm text-on-surface-variant">
                  Demo mode does not save contributions or issue XP.
                </p>
              )}
              {responseState === 'unavailable' && (
                <p role="status" className="relative mt-3 text-label-sm text-on-surface-variant">
                  Connect a verified account and data service to load contribution history.
                </p>
              )}
            </Card>
          </section>

          <p className="text-center text-body-sm text-on-surface-variant">
            Training contributions earn XP after trusted review and approval.
          </p>
        </>
      ) : (
        <section>
          <SectionTitle>Available Data Tasks</SectionTitle>
          <Card className="p-4 text-body-sm text-on-surface-variant" role="status">
            No independently published data tasks are available yet. The training modules above accept reviewed
            contributions and show XP only after the server approves them.
          </Card>
        </section>
      )}
      <Toast show={!!lockedNotice} message={lockedNotice} icon="lock" />
    </AppShell>
  )
}
