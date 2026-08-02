import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { ChipBar, EmptyState, Icon, List, tone } from '../components/ui.jsx'
import { notifications } from '../data/mock.js'

const cats = ['All', 'Unread', 'Robot Activity', 'Deployment', 'Data Task', 'Earnings', 'Wallet']

/* Notifications are a timeline, not a card grid: dense rows, unread carried
   by a marker and weight rather than by a whole boxed container. */
function NotificationRow({ n }) {
  const c = tone(n.tone)
  return (
    <div className={`flex gap-3 px-4 py-3.5 ${n.unread ? '' : 'opacity-70'}`}>
      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${c.bg}`}>
        <Icon name={n.icon} className={`${c.text} text-[18px]`} fill />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-body-md ${n.unread ? 'text-on-surface' : 'text-on-surface-variant'}`}>{n.text}</p>
        <p className="mt-0.5 text-label-sm text-on-surface-variant">
          {n.cat} · {n.time}
        </p>
      </div>
      {n.unread && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-tertiary" aria-label="Unread" />
      )}
    </div>
  )
}

export default function Notifications() {
  const [cat, setCat] = useState('All')
  const unread = notifications.filter((n) => n.unread).length

  const list = notifications.filter((n) =>
    cat === 'All' ? true : cat === 'Unread' ? n.unread : n.cat === cat,
  )

  return (
    <AppShell
      title="Notifications"
      subtitle={unread ? `${unread} unread` : 'All caught up'}
      back
      avatar={false}
      right={
        unread ? (
          <button className="tap px-2 text-label-md text-primary transition-colors duration-fast hover:underline">
            Mark read
          </button>
        ) : null
      }
    >
      <ChipBar items={cats} value={cat} onChange={setCat} visible={3} />

      {list.length ? (
        <List>
          {list.map((n, i) => (
            <NotificationRow key={i} n={n} />
          ))}
        </List>
      ) : (
        <EmptyState
          icon="notifications_off"
          title={cat === 'Unread' ? "You're all caught up" : `Nothing in ${cat}`}
          desc={
            cat === 'Unread'
              ? 'New robot activity, deployment updates and payouts will appear here.'
              : 'Try a different filter — activity from other areas may still be waiting.'
          }
        />
      )}
    </AppShell>
  )
}
