import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Card, GradIcon, Icon, SectionTitle, Tabs, Toast } from '../components/ui.jsx'
import { trainingTiles } from '../data/mock.js'

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
  const [lockedNotice, setLockedNotice] = useState('')

  const showLockedNotice = (title) => {
    setLockedNotice(`${title} is coming soon — keep mining.`)
    window.setTimeout(() => setLockedNotice(''), 2600)
  }

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
