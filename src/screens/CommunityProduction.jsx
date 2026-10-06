import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Field, SectionTitle, Icon } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'

export default function CommunityProduction() {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [alias, setAlias] = useState('')
  const [message, setMessage] = useState('')

  const refresh = async () => setSnapshot(await browserEcosystemClient.community())

  useEffect(() => {
    let active = true
    browserEcosystemClient
      .community()
      .then((next) => {
        if (!active) return
        setSnapshot(next)
        setAlias(next?.leaderboard?.display_alias || '')
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Community service is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const join = async (event) => {
    setBusy(event.id)
    setMessage('')
    try {
      await browserEcosystemClient.joinEvent(event.id, true)
      setMessage(`You joined ${event.title}.`)
      await refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Could not join event.')
    } finally {
      setBusy('')
    }
  }

  const setLeaderboard = async (optedIn) => {
    setBusy('leaderboard')
    setMessage('')
    try {
      await browserEcosystemClient.setLeaderboard(optedIn, alias)
      setMessage(optedIn ? 'Leaderboard opt-in saved.' : 'Leaderboard participation disabled.')
      await refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Leaderboard preference failed.')
    } finally {
      setBusy('')
    }
  }

  const events = snapshot?.events || []
  const participation = snapshot?.participation || []
  const announcements = snapshot?.announcements || []

  return (
    <AppShell title="Community" subtitle="Connect, take part, grow together">
      {loading && (
        <StateView kind="loading" title="Loading community" desc="Reading published events and participation." />
      )}
      {!loading && error && <StateView kind="error" title="Community unavailable" desc={error} />}
      {!loading && !error && snapshot && (
        <>
          {message && (
            <p
              role="status"
              className="rounded-xl border border-tertiary/20 bg-tertiary/5 p-3 text-body-sm text-on-surface"
            >
              {message}
            </p>
          )}
          <Card className="overflow-hidden border-primary/20 bg-primary-container/10 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Icon name="groups" />
              </span>
              <div>
                <h2 className="text-title font-semibold text-on-surface">Your WRS community</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">Events, updates and friendly competition.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button to="/deploy?tab=Leaderboard" variant="tonal" size="sm">
                Leaderboard
              </Button>
              <Button to="/referrals" variant="ghost" size="sm">
                Invite friends
              </Button>
            </div>
          </Card>
          <section>
            <SectionTitle action={`${events.length} events`}>Events</SectionTitle>
            <div className="space-y-3">
              {events.map((event) => {
                const record = participation.find((entry) => entry.event_id === event.id)
                return (
                  <Card key={event.id} className="p-card-padding">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-title font-semibold text-on-surface">{event.title}</h2>
                        <p className="mt-1 text-body-sm text-on-surface-variant">{event.description}</p>
                        <p className="mt-2 text-label-sm text-outline">
                          {new Date(event.starts_at).toLocaleString()} → {new Date(event.ends_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge t={record?.status === 'attended' ? 'success' : record ? 'primary' : 'outline'}>
                        {record?.status || 'Open'}
                      </Badge>
                    </div>
                    {!record && (
                      <Button full className="mt-4" loading={busy === event.id} onClick={() => join(event)}>
                        Join &amp; enable reminder
                      </Button>
                    )}
                  </Card>
                )
              })}
              {!events.length && (
                <Card className="flex items-center gap-4 p-4">
                  <svg
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                    width="52"
                    height="52"
                    viewBox="0 0 64 64"
                    fill="none"
                  >
                    <rect x="10" y="14" width="44" height="42" rx="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M10 27h44M22 8v13M42 8v13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="25" cy="38" r="3" fill="currentColor" />
                    <circle cx="39" cy="38" r="3" fill="currentColor" />
                  </svg>
                  <div>
                    <h3 className="text-title font-semibold text-on-surface">No upcoming events</h3>
                    <p className="mt-1 text-body-sm text-on-surface-variant">New events will appear here.</p>
                  </div>
                </Card>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Leaderboard profile</SectionTitle>
            <Card className="space-y-3 p-card-padding">
              <div className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-on-surface-variant">Visibility</span>
                <Badge t={snapshot.leaderboard?.opted_in ? 'success' : 'outline'}>
                  {snapshot.leaderboard?.opted_in ? 'Public alias' : 'Private'}
                </Badge>
              </div>
              <Field
                label="Public alias"
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                placeholder="Choose a public alias"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  full
                  loading={busy === 'leaderboard'}
                  disabled={alias.trim().length < 2 || Boolean(busy)}
                  onClick={() => setLeaderboard(true)}
                >
                  {snapshot.leaderboard?.opted_in ? 'Save alias' : 'Join leaderboard'}
                </Button>
                {snapshot.leaderboard?.opted_in && (
                  <Button full variant="ghost" disabled={Boolean(busy)} onClick={() => setLeaderboard(false)}>
                    Leave leaderboard
                  </Button>
                )}
              </div>
              <p className="text-label-sm text-outline">
                Only your alias and settled mining rewards appear publicly. Your contact details stay private.
              </p>
            </Card>
          </section>

          <section>
            <SectionTitle action={`${announcements.length}`}>Announcements</SectionTitle>
            <div className="space-y-3">
              {!announcements.length && (
                <Card className="flex items-center gap-3 p-4">
                  <Icon name="campaign" className="text-outline" />
                  <p className="text-body-sm text-on-surface-variant">No updates yet. Check back soon.</p>
                </Card>
              )}
              {announcements.map((item) => (
                <Card key={item.id} className="p-4">
                  <h3 className="text-title text-on-surface">{item.title}</h3>
                  <p className="mt-1 text-body-sm text-on-surface-variant">{item.body}</p>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  )
}
