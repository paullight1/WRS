import { useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Button, ChipBar, List } from '../components/ui.jsx'
import StateView, { LoadingView } from '../components/states/StateView.jsx'
import NotificationArt from '../components/notifications/NotificationArt.jsx'
import { useNotify } from '../components/notifications/Notify.jsx'
import { useMockFetch, useOnline } from '../lib/appState.js'
import { notifications } from '../data/mock.js'

const cats = ['All', 'Unread', 'Robot Activity', 'Deployment', 'Data Task', 'Earnings', 'Wallet']

/* The mock carries relative ages ('10m', '1d'). Real timestamps will replace
   this, but the grouping the screen needs is the same either way. */
function bucketOf(time) {
  if (/[mh]$/.test(time)) return 'Today'
  if (time === '1d') return 'Yesterday'
  return 'Earlier'
}
const ORDER = ['Today', 'Yesterday', 'Earlier']

/* A timeline, not a card grid: dense rows, unread carried by weight and a live
   marker rather than by a whole boxed container. */
function NotificationRow({ n, onRead }) {
  return (
    <button
      type="button"
      onClick={() => onRead(n)}
      className="tap flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-fast hover:bg-white/[.04]"
    >
      <NotificationArt cat={n.cat} muted={!n.unread} />

      <span className="min-w-0 flex-1">
        <span className={`block text-body-md ${n.unread ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          {n.text}
        </span>
        <span className="mt-0.5 block text-label-sm text-on-surface-variant">
          {n.cat} · {n.time}
        </span>
      </span>

      {n.unread && (
        <span className="relative mt-1 grid h-3 w-3 shrink-0 place-items-center">
          <span className="absolute h-3 w-3 rounded-full bg-tertiary/40 motion-safe:animate-breathe" />
          <span className="h-2 w-2 rounded-full bg-tertiary" />
          <span className="sr-only">Unread</span>
        </span>
      )}
    </button>
  )
}

export default function Notifications() {
  const [cat, setCat] = useState('All')
  const [read, setRead] = useState(() => new Set())
  const online = useOnline()
  const notify = useNotify()

  const { data, loading } = useMockFetch(notifications)

  const all = useMemo(
    () => (data || []).map((n, i) => ({ ...n, id: i, unread: n.unread && !read.has(i) })),
    [data, read],
  )
  const unread = all.filter((n) => n.unread).length

  const list = all.filter((n) => (cat === 'All' ? true : cat === 'Unread' ? n.unread : n.cat === cat))

  const groups = ORDER.map((g) => [g, list.filter((n) => bucketOf(n.time) === g)]).filter(([, rows]) => rows.length)

  const markOne = (n) => {
    if (!n.unread) return
    setRead((s) => new Set(s).add(n.id))
  }

  const markAll = () => {
    setRead(new Set(all.map((n) => n.id)))
    notify({ kind: 'success', title: 'All caught up', body: `${unread} notifications marked as read` })
  }

  /* Order matters: offline outranks everything (nothing shown can be trusted
     to be current), then loading, then the empty variants. */
  const body = () => {
    if (!online) {
      return (
        <StateView
          kind="offline"
          live
          title="You're offline"
          desc="Notifications will refresh as soon as you're back on a connection."
          action={
            <Button variant="ghost" icon="refresh" onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
        />
      )
    }

    if (loading) {
      return <LoadingView title="Checking for updates" desc="This takes a moment on a slow connection." />
    }

    if (!all.length) {
      return (
        <StateView
          kind="empty"
          title="Nothing here yet"
          desc="Robot activity, deployment updates and payouts will land here as they happen."
          action={<Button to="/home">Go to dashboard</Button>}
        />
      )
    }

    if (!list.length) {
      const caught = cat === 'Unread'
      return (
        <StateView
          live
          kind={caught ? 'caughtUp' : 'noResults'}
          title={caught ? "You're all caught up" : `Nothing in ${cat}`}
          desc={
            caught
              ? 'Every notification has been read. New activity will appear here.'
              : 'Activity from other areas may still be waiting — try another filter.'
          }
          action={
            <Button variant="ghost" onClick={() => setCat('All')}>
              Show all
            </Button>
          }
        />
      )
    }

    return (
      <div className="space-y-5">
        {groups.map(([g, rows]) => (
          <section key={g}>
            <h2 className="mb-2 px-1 text-label-sm text-on-surface-variant">{g}</h2>
            <List>
              {rows.map((n) => (
                <NotificationRow key={n.id} n={n} onRead={markOne} />
              ))}
            </List>
          </section>
        ))}
      </div>
    )
  }

  return (
    <AppShell
      title="Notifications"
      subtitle={loading ? 'Checking…' : unread ? `${unread} unread` : 'All caught up'}
      back
      avatar={false}
      right={
        unread ? (
          <button
            onClick={markAll}
            className="tap px-2 text-label-md text-primary transition-colors duration-fast hover:underline"
          >
            Mark read
          </button>
        ) : null
      }
    >
      <ChipBar items={cats} value={cat} onChange={setCat} visible={3} />
      {body()}
    </AppShell>
  )
}
