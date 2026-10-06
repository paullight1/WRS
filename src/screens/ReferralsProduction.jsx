import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import RewardArt from '../components/rewards/RewardArt.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Field, SectionTitle } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'

function referralCodeFrom(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw, window.location.origin)
    const code = url.searchParams.get('referralCode') || url.searchParams.get('ref')
    if (code) return code.trim().toUpperCase()
  } catch {
    // Treat non-URL input as a referral code.
  }
  return raw.toUpperCase()
}

export default function ReferralsProduction() {
  const [snapshot, setSnapshot] = useState(null)
  const [rewards, setRewards] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const referralLink = snapshot?.code
    ? `${window.location.origin}/register?referralCode=${encodeURIComponent(snapshot.code)}`
    : ''

  const copyInvite = async (value, label) => {
    setMessage('')
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.')
      await navigator.clipboard.writeText(value)
      setMessage(`${label} copied.`)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Could not copy the referral invite.')
    }
  }

  const shareInvite = async () => {
    if (!referralLink) return
    if (!navigator.share) {
      await copyInvite(referralLink, 'Referral link')
      return
    }
    setMessage('')
    try {
      await navigator.share({
        title: 'Join World Robotic System',
        text: 'Join World Robotic System using my referral link.',
        url: referralLink,
      })
      setMessage('Referral invite shared.')
    } catch (reason) {
      if (reason?.name !== 'AbortError') {
        setMessage(reason instanceof Error ? reason.message : 'Could not share the referral invite.')
      }
    }
  }

  const refresh = async () => {
    const [referrals, rewardData] = await Promise.all([
      browserEcosystemClient.referrals(),
      browserEcosystemClient.rewards(),
    ])
    setSnapshot(referrals)
    setRewards(rewardData)
  }

  useEffect(() => {
    let active = true
    Promise.all([browserEcosystemClient.referrals(), browserEcosystemClient.rewards()])
      .then(([next, rewardData]) => {
        if (active) {
          setSnapshot(next)
          setRewards(rewardData)
        }
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
      await browserEcosystemClient.acceptReferral(referralCodeFrom(inviteCode))
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
    <AppShell title="Referrals" subtitle="Invite friends. Earn XP.">
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
          {rewards && (
            <Card className="border-primary/25 bg-primary-container/10 p-4">
              <div className="flex items-center gap-3">
                <RewardArt kind="referral" className="h-20 w-24 shrink-0" />
                <div>
                  <h2 className="text-title font-semibold">Your referral rewards</h2>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    {rewards.activities.find((activity) => activity.source === 'referral')?.xp
                      ? `Earn ${rewards.activities.find((activity) => activity.source === 'referral').xp} XP per eligible referral award.`
                      : 'Referral XP rewards are paused.'}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-3">
                {[
                  [rewards.dashboard.referralXp, 'XP earned'],
                  [rewards.dashboard.referrals.qualified, 'Qualified'],
                  [rewards.dashboard.referrals.pending, 'Pending'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <p className="tnum text-title font-bold">{value.toLocaleString()}</p>
                    <p className="text-label-sm text-on-surface-variant">{label}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card className="p-card-padding">
            <p className="text-label-sm text-outline">Your referral link</p>
            <p className="mt-2 break-all rounded-xl border border-white/10 bg-black/10 p-3 font-data text-body-md text-on-surface">
              {referralLink}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="ghost" icon="content_copy" onClick={() => copyInvite(referralLink, 'Referral link')}>
                Copy link
              </Button>
              <Button icon="share" onClick={shareInvite}>
                Share invite
              </Button>
            </div>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Your invite opens signup with your referral prefilled. Rewards are earned only by qualified referrals,
              after account verification, paid package activation and the server review window.
            </p>
          </Card>

          <Card className="space-y-3 p-card-padding">
            <Field
              label="Referral link or code you received"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="Paste referral link or enter code"
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
