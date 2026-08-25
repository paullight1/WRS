import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Field, SectionTitle } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'

export default function ReferralsProduction() {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = async () => setSnapshot(await browserEcosystemClient.referrals())

  useEffect(() => {
    let active = true
    browserEcosystemClient
      .referrals()
      .then((next) => {
        if (active) setSnapshot(next)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Referral service is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const accept = async () => {
    setBusy(true)
    setMessage('')
    try {
      await browserEcosystemClient.acceptReferral(inviteCode)
      setInviteCode('')
      setMessage(
        'Referral attribution recorded. Rewards remain pending until verified paid activation and the review window complete.',
      )
      await refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Referral code could not be accepted.')
    } finally {
      setBusy(false)
    }
  }

  const relationships = snapshot?.relationships || []

  return (
    <AppShell title="Referrals" subtitle="Verified qualification only">
      {loading && (
        <StateView
          kind="loading"
          title="Loading referrals"
          desc="Reading your referral identity and qualification state."
        />
      )}
      {!loading && error && <StateView kind="error" title="Referrals unavailable" desc={error} />}
      {!loading && !error && snapshot && (
        <>
          <Card className="p-card-padding">
            <p className="text-label-sm text-outline">Your referral code</p>
            <p className="mt-2 font-data text-data-lg text-on-surface">{snapshot.code}</p>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Sharing a code does not create money or points. Qualification happens only after account verification,
              paid package activation and the server review window.
            </p>
          </Card>

          <Card className="space-y-3 p-card-padding">
            <Field
              label="Referral code you received"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="Enter code"
            />
            <Button full loading={busy} disabled={inviteCode.trim().length < 8} onClick={accept}>
              Apply referral
            </Button>
          </Card>

          <section>
            <SectionTitle action={`${relationships.length} records`}>Referral history</SectionTitle>
            <div className="space-y-3">
              {relationships.map((relationship) => (
                <Card key={relationship.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-data text-data-sm text-outline">{relationship.referral_code}</p>
                      <p className="mt-1 text-label-sm text-on-surface-variant">
                        Created {new Date(relationship.created_at).toLocaleString()}
                      </p>
                      {relationship.eligible_at && (
                        <p className="mt-1 text-label-sm text-outline">
                          Review eligible {new Date(relationship.eligible_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge
                      t={
                        relationship.status === 'qualified'
                          ? 'success'
                          : relationship.status === 'rejected'
                            ? 'outline'
                            : 'gold'
                      }
                    >
                      {relationship.status}
                    </Badge>
                  </div>
                </Card>
              ))}
              {!relationships.length && (
                <StateView
                  kind="empty"
                  title="No referral relationships"
                  desc="Attribution records will appear here after a valid code is accepted or someone uses yours."
                />
              )}
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
