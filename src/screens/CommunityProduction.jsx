import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Field, SectionTitle } from '../components/ui.jsx'
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
      setMessage(`Joined ${event.title}. Attendance rewards, if any, require operator verification after the event.`)
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
    <AppShell title="Community" subtitle="Verified participation">
      {loading && (
        <StateView kind="loading" title="Loading community" desc="Reading published events and participation." />
      )}
      {!loading && error && <StateView kind="error" title="Community unavailable" desc={error} />}
      {!loading && !error && snapshot && (
        <>
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
                <StateView
                  kind="empty"
                  title="No published community events"
                  desc="Only active server-published events appear here."
                />
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Leaderboard privacy</SectionTitle>
            <Card className="space-y-3 p-card-padding">
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
                  disabled={alias.trim().length < 2}
                  onClick={() => setLeaderboard(true)}
                >
                  Opt in
                </Button>
                <Button full variant="ghost" loading={busy === 'leaderboard'} onClick={() => setLeaderboard(false)}>
                  Opt out
                </Button>
              </div>
              <p className="text-label-sm text-outline">
                Leaderboard display is opt-in. WRS does not publish your account name, email, phone or wallet identity.
              </p>
            </Card>
          </section>

          <section>
            <SectionTitle action={`${announcements.length}`}>Announcements</SectionTitle>
            <div className="space-y-3">
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
      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
    </AppShell>
  )
}
