import { useState } from 'react'
import { Field, Icon } from '../ui.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { Card } from '../ui/card.jsx'
import { activityPresets, decimalToAtomic, minerLevelPresets } from '../../domain/mining/rewardPolicy.ts'
import { browserAccountClient } from '../../infrastructure/account/browserAccountClient.ts'

function integerValue(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    const parsed = Number(value)
    if (Number.isSafeInteger(parsed)) return parsed
  }
  return null
}

function formatAtomic(value, scale) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const raw = String(value)
  if (!/^\d+$/.test(raw)) return null
  const places = integerValue(scale)
  if (places === null || places > 18) return null
  if (!places) return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const padded = raw.padStart(places + 1, '0')
  const whole = padded
    .slice(0, -places)
    .replace(/^0+(?=\d)/, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fraction = padded.slice(-places).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}

function prettyTotalLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

export default function RewardRulesEditor({
  snapshot,
  onReload,
  recentMfa,
  securitySettingsHref = '/settings/security',
  compact = false,
}) {
  const [view, setView] = useState('saved')
  const [activities, setActivities] = useState(() =>
    activityPresets.map((rule) => ({ ...rule, rbc: '', status: 'active' })),
  )
  const [levels, setLevels] = useState(() =>
    minerLevelPresets.map((level) => ({
      ...level,
      miningPower: 0,
      requiredVerifiedActivityCount: 0,
      achievements: level.requiredAchievementCodes.join(', '),
    })),
  )
  const [economics, setEconomics] = useState({
    scale: '',
    hourly: '',
    sessionCap: '',
    dailyCap: '',
    globalCap: '',
    minimumActivities: '',
    powerBonus: '',
  })
  const [reason, setReason] = useState('')
  const [selectedRule, setSelectedRule] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [proof, setProof] = useState({
    userId: '',
    source: 'validation',
    referenceId: '',
    evidence: '',
    achievementCode: '',
  })
  const updateActivity = (source, key, value) =>
    setActivities((current) => current.map((rule) => (rule.source === source ? { ...rule, [key]: value } : rule)))
  const updateLevel = (level, key, value) =>
    setLevels((current) => current.map((rule) => (rule.level === level ? { ...rule, [key]: value } : rule)))
  const updateEconomics = (key, value) => setEconomics((current) => ({ ...current, [key]: value }))
  const selectedRuleId = selectedRule || (compact ? snapshot?.rules?.[0]?.id : '') || ''
  const selectedSavedRule = (snapshot?.rules || []).find((rule) => rule.id === selectedRuleId)
  const savedRules = Array.isArray(snapshot?.rules) ? snapshot.rules : null
  const issuance = snapshot?.issuance && typeof snapshot.issuance === 'object' ? snapshot.issuance : null
  const activeRule = savedRules?.find((rule) => rule?.status === 'active') || null
  const recordedAwards = integerValue(issuance?.awardCount)
  const totalIssued = formatAtomic(issuance?.totalIssuedAtomic, issuance?.atomicScale)
  const verifiedTotals =
    snapshot?.verifiedTotals && typeof snapshot.verifiedTotals === 'object' ? snapshot.verifiedTotals : null
  const providedVerifiedTotals = verifiedTotals
    ? Object.entries(verifiedTotals).filter(([, value]) => {
        if (typeof value === 'number') return Number.isFinite(value)
        if (typeof value === 'string') return value.trim() !== ''
        return false
      })
    : []
  const positiveAtomic = (value) => /^\d+$/.test(String(value ?? '')) && BigInt(value) > 0n
  const canEnableRbc = Boolean(
    selectedSavedRule?.status === 'active' &&
    Number.isInteger(selectedSavedRule.atomicScale) &&
    positiveAtomic(selectedSavedRule.baseRateAtomicPerHour) &&
    positiveAtomic(selectedSavedRule.perSessionCapAtomic) &&
    positiveAtomic(selectedSavedRule.perUserDailyCapAtomic) &&
    positiveAtomic(snapshot?.issuance?.globalIssuanceCapAtomic),
  )
  const submit = async (action, values = {}) => {
    if (!recentMfa || busy || reason.trim().length < 3 || reason.trim().length > 1000) {
      setMessage('Verify your authenticator and enter a reason of 3–1000 characters.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const result = await browserAccountClient.operationsAction({ action, reason, ...values })
      if (result.ruleId) setSelectedRule(result.ruleId)
      setMessage(
        action === 'rewards.rule.save'
          ? 'Draft saved. Activate it to award XP. Enable RBC after completing the mining amounts and limits.'
          : 'Reward settings updated.',
      )
      try {
        await onReload()
      } catch {
        setMessage('Reward settings saved. Refresh to load the latest settings.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reward settings could not be updated.')
    } finally {
      setBusy(false)
    }
  }
  const save = () => {
    try {
      const requiredEconomics = [
        'scale',
        'hourly',
        'powerBonus',
        'sessionCap',
        'dailyCap',
        'globalCap',
        'minimumActivities',
      ]
      const filledEconomics = requiredEconomics.filter((key) => economics[key] !== '').length
      if (filledEconomics && filledEconomics !== requiredEconomics.length)
        throw new Error('Fill all mining amounts and limits, or leave them blank for an XP-only rule.')
      if (!filledEconomics && activities.some((activity) => activity.rbc !== '' && Number(activity.rbc) > 0))
        throw new Error('Enter approved mining amounts and limits before adding RBC activity rewards.')
      const scale = Number(economics.scale)
      const rule = {
        levelRules: levels.map(({ achievements, ...level }) => ({
          ...level,
          requiredAchievementCodes: achievements
            .split(',')
            .map((code) => code.trim())
            .filter(Boolean),
        })),
        activityRules: Object.fromEntries(
          activities.map((activity) => [
            activity.source,
            {
              xp: Number(activity.xp),
              rbcAtomic: decimalToAtomic(activity.rbc || '0', scale),
              miningPower: Number(activity.miningPower),
              dailyLimit: Number(activity.dailyLimit),
              status: activity.status,
            },
          ]),
        ),
        ...(filledEconomics === requiredEconomics.length
          ? {
              atomicScale: scale,
              baseRateAtomicPerHour: decimalToAtomic(economics.hourly, scale),
              miningPowerBonusAtomicPerHour: decimalToAtomic(economics.powerBonus, scale),
              perSessionCapAtomic: decimalToAtomic(economics.sessionCap, scale),
              perUserDailyCapAtomic: decimalToAtomic(economics.dailyCap, scale),
              globalIssuanceCapAtomic: decimalToAtomic(economics.globalCap, scale),
              minimumVerifiedActivities: Number(economics.minimumActivities),
            }
          : {}),
      }
      return submit('rewards.rule.save', { rule })
    } catch (error) {
      setMessage(error.message)
    }
  }
  return (
    <section className="space-y-4">
      {compact && (
        <div className="admin-reward-tabs" role="tablist" aria-label="Reward controls">
          {[
            ['saved', 'Saved rules'],
            ['draft', 'Create a rule'],
            ['verify', 'Check contribution'],
          ].map(([key, label]) => (
            <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {(!compact || view === 'draft') && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/10 bg-primary/[.035] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                <Icon name="tune" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Create a reward rule</h3>
                <p className="mt-1 max-w-xl text-xs leading-5 text-on-surface-variant">
                  Set XP progress and eligible RBC rewards. Values here are drafts until you save and activate them.
                </p>
              </div>
            </div>
            <Badge variant={recentMfa ? 'success' : 'warning'}>
              {recentMfa ? 'Ready to edit' : 'MFA check needed'}
            </Badge>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-[#f7c948]/15 bg-[#f7c948]/[.035] px-4 py-3">
            <Icon name="info" className="mt-0.5 text-[18px] text-[#f7c948]" />
            <p className="text-xs leading-5 text-on-surface-variant">
              XP activity rewards and miner levels are unsaved examples for a draft. Review them before saving; they are
              not an active reward rule.
            </p>
          </div>
          <Card className="space-y-3 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Activity rewards</h3>
                <p className="mt-1 text-xs text-outline">Configure progress credit for verified work.</p>
              </div>
              <Badge variant="secondary">{activities.length} activities</Badge>
            </div>
            {activities.map((activity) => (
              <details key={activity.source} className="rounded-xl border border-white/10 p-3">
                <summary className="cursor-pointer text-title">
                  {activity.name} · {activity.xp} XP{activity.rbc !== '' ? ` · ${activity.rbc} RBC` : ''}
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {['xp', 'rbc', 'miningPower', 'dailyLimit'].map((key) => (
                    <Field
                      key={key}
                      id={`reward-activity-${activity.source}-${key}`}
                      label={
                        {
                          xp: 'XP reward',
                          rbc: 'RBC reward',
                          miningPower: 'Mining power increase',
                          dailyLimit: 'Daily limit',
                        }[key]
                      }
                      type="number"
                      min="0"
                      step={key === 'rbc' ? 'any' : '1'}
                      value={activity[key]}
                      onChange={(event) =>
                        updateActivity(
                          activity.source,
                          key,
                          key === 'rbc' ? event.target.value : Number(event.target.value),
                        )
                      }
                    />
                  ))}
                  <label className="text-label-sm">
                    Status
                    <select
                      className="mt-1 block w-full rounded-lg bg-surface-container p-2"
                      value={activity.status}
                      onChange={(event) => updateActivity(activity.source, 'status', event.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>
                </div>
                <p className="mt-2 text-label-sm text-outline">
                  {['daily', 'profile', 'verification', 'training'].includes(activity.source)
                    ? 'XP only. Rewards require a real completed activity.'
                    : 'Requires an approved contribution, passed assessment, verified event, or approved referral.'}
                </p>
              </details>
            ))}
          </Card>
          <Card className="space-y-3 p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-on-surface">Miner levels</h3>
              <p className="mt-1 text-xs text-outline">Set unlock requirements and mining multipliers.</p>
            </div>
            {levels.map((level) => (
              <details key={level.level} className="rounded-xl border border-white/10 p-3">
                <summary className="cursor-pointer">
                  {level.name} · {level.requiredXp.toLocaleString()} XP · {level.multiplierBps / 10000}×
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    id={`reward-level-${level.level}-xp`}
                    label="XP required"
                    type="number"
                    min="0"
                    value={level.requiredXp}
                    onChange={(e) => updateLevel(level.level, 'requiredXp', Number(e.target.value))}
                  />
                  <Field
                    id={`reward-level-${level.level}-multiplier`}
                    label="Mining multiplier"
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={level.multiplierBps / 10000}
                    onChange={(e) =>
                      updateLevel(level.level, 'multiplierBps', Math.round(Number(e.target.value) * 10000))
                    }
                  />
                  <Field
                    id={`reward-level-${level.level}-activities`}
                    label="Approved activities needed"
                    type="number"
                    min="0"
                    value={level.requiredVerifiedActivityCount}
                    onChange={(e) => updateLevel(level.level, 'requiredVerifiedActivityCount', Number(e.target.value))}
                  />
                  <Field
                    id={`reward-level-${level.level}-achievements`}
                    label="Required milestones (comma separated)"
                    value={level.achievements}
                    onChange={(e) => updateLevel(level.level, 'achievements', e.target.value)}
                  />
                </div>
              </details>
            ))}
          </Card>
          <Card className="space-y-3 p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-on-surface">Mining amounts and limits</h3>
              <p className="mt-1 text-xs text-outline">Safety limits for every configured RBC reward.</p>
            </div>
            <p className="text-body-sm text-outline">
              Enter the approved rate, activity rewards, decimal places, and RBC limits. Leave all amount and limit
              fields blank to save an XP-only draft.
            </p>
            {Object.entries({
              hourly: 'Base RBC per hour (1×)',
              powerBonus: 'Extra RBC per hour for each mining power point',
              sessionCap: 'Maximum RBC per mining cycle',
              dailyCap: 'Maximum RBC per user per day',
              globalCap: 'Total RBC distribution limit',
              scale: 'RBC decimal places',
              minimumActivities: 'Approved contributions required to start mining',
            }).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                type="number"
                min="0"
                step={['scale', 'minimumActivities'].includes(key) ? '1' : 'any'}
                value={economics[key]}
                onChange={(e) => updateEconomics(key, e.target.value)}
              />
            ))}
            <Field
              label="Reason for this change"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
            />
            {!recentMfa && (
              <div className="space-y-2">
                <p className="text-body-sm text-outline">
                  Confirm your authenticator before saving or activating reward settings.
                </p>
                <Button asChild variant="secondary">
                  <a href={securitySettingsHref}>Set up authenticator</a>
                </Button>
              </div>
            )}
            <Button full disabled={!recentMfa || busy || reason.trim().length < 3} loading={busy} onClick={save}>
              Save draft rule
            </Button>
          </Card>
        </>
      )}
      {(!compact || view === 'saved') && (
        <>
          {compact && (
            <Card className="admin-reward-overview space-y-4 p-5">
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Reward settings at a glance</h3>
                <p className="mt-1 text-xs text-outline">Live values returned by the reward service.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activeRule && (
                  <div className="rounded-lg border border-white/[.08] bg-background/50 px-3 py-2">
                    <span className="block text-[11px] text-outline">Active rule</span>
                    <strong className="mt-0.5 block text-sm text-on-surface">
                      {activeRule.version === undefined ? 'Active' : `Version ${activeRule.version}`}
                    </strong>
                  </div>
                )}
                {savedRules && (
                  <div className="rounded-lg border border-white/[.08] bg-background/50 px-3 py-2">
                    <span className="block text-[11px] text-outline">Versions shown</span>
                    <strong className="mt-0.5 block text-sm text-on-surface">
                      {savedRules.length.toLocaleString()}
                    </strong>
                  </div>
                )}
                {issuance && typeof issuance.enabled === 'boolean' && (
                  <div className="rounded-lg border border-white/[.08] bg-background/50 px-3 py-2">
                    <span className="block text-[11px] text-outline">RBC payouts</span>
                    <strong className="mt-0.5 block text-sm text-on-surface">
                      {issuance.enabled ? 'On' : 'Paused'}
                    </strong>
                  </div>
                )}
                {recordedAwards !== null && (
                  <div className="rounded-lg border border-white/[.08] bg-background/50 px-3 py-2">
                    <span className="block text-[11px] text-outline">Recorded awards</span>
                    <strong className="mt-0.5 block text-sm text-on-surface">{recordedAwards.toLocaleString()}</strong>
                  </div>
                )}
                {totalIssued !== null && (
                  <div className="rounded-lg border border-white/[.08] bg-background/50 px-3 py-2">
                    <span className="block text-[11px] text-outline">RBC awarded</span>
                    <strong className="mt-0.5 block text-sm text-on-surface">{totalIssued} RBC</strong>
                  </div>
                )}
                {providedVerifiedTotals.map(([key, value]) => (
                  <div className="rounded-lg border border-white/[.08] bg-background/50 px-3 py-2" key={key}>
                    <span className="block text-[11px] text-outline">{prettyTotalLabel(key)}</span>
                    <strong className="mt-0.5 block text-sm text-on-surface">{String(value)}</strong>
                  </div>
                ))}
              </div>
              {savedRules && !activeRule && (
                <p className="text-xs text-on-surface-variant">No active reward rule is saved.</p>
              )}
              {!savedRules && !issuance && !providedVerifiedTotals.length && (
                <p className="text-xs text-on-surface-variant">The reward service did not return a saved overview.</p>
              )}
            </Card>
          )}
          <Card className="space-y-4 p-5">
            <h3 className="text-sm font-semibold text-on-surface">Saved reward settings</h3>
            <p className="text-xs text-outline">Choose a saved version to manage XP rewards and RBC payouts.</p>
            {!(snapshot?.rules || []).length && (
              <p className="text-sm text-on-surface-variant">No saved rules. Create a rule to get started.</p>
            )}
            <label className="block text-label-sm">
              Saved rule
              <select
                className="mt-1 w-full rounded-lg bg-surface-container p-3"
                value={selectedRuleId}
                onChange={(e) => setSelectedRule(e.target.value)}
              >
                <option value="">Select a rule</option>
                {(snapshot?.rules || []).map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    Version {rule.version} · {rule.status}
                    {rule.issuanceEnabled ? ' · RBC rewards on' : ''}
                  </option>
                ))}
              </select>
            </label>
            {compact && selectedSavedRule && (
              <div className="admin-saved-rule">
                <div>
                  <span>Rule status</span>
                  <strong>{selectedSavedRule.status}</strong>
                </div>
                <div>
                  <span>RBC rewards</span>
                  <strong>
                    {typeof selectedSavedRule.issuanceEnabled === 'boolean'
                      ? selectedSavedRule.issuanceEnabled
                        ? 'Enabled'
                        : 'Paused'
                      : 'Not reported'}
                  </strong>
                </div>
                <details>
                  <summary>View configured rewards</summary>
                  {Object.entries(selectedSavedRule.activityRules || {}).length ? (
                    <dl>
                      {Object.entries(selectedSavedRule.activityRules).map(([source, rule]) => (
                        <div key={source}>
                          <dt>{activityPresets.find((item) => item.source === source)?.name || source}</dt>
                          <dd>
                            {rule.xp} XP · {rule.status}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="admin-muted">No activity rewards in this version.</p>
                  )}
                  {(selectedSavedRule.levelRules || []).length > 0 && (
                    <dl>
                      {selectedSavedRule.levelRules.map((level) => (
                        <div key={level.level}>
                          <dt>{level.name}</dt>
                          <dd>
                            {level.requiredXp} XP · {level.multiplierBps / 10000}× power
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </details>
              </div>
            )}
            <Field
              label="Reason for reward rule change"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
            />
            <div className="grid grid-cols-2 gap-2">
              {[
                ['rewards.rule.activate', 'Activate XP rule'],
                ['rewards.issuance.enable', 'Enable RBC'],
                ['rewards.issuance.disable', 'Pause RBC'],
                ['rewards.rule.disable', 'Disable rule'],
              ].map(([action, label]) => (
                <Button
                  key={action}
                  variant="secondary"
                  disabled={
                    !recentMfa ||
                    !selectedRuleId ||
                    busy ||
                    reason.trim().length < 3 ||
                    (action === 'rewards.issuance.enable' && !canEnableRbc)
                  }
                  onClick={() => submit(action, { ruleId: selectedRuleId })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </Card>
        </>
      )}
      {(!compact || view === 'verify') && (
        <Card className="space-y-3 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-on-surface">Check a contribution or milestone</h3>
            <p className="mt-1 text-xs text-outline">Save reviewed evidence for a user account.</p>
          </div>
          <p className="text-body-sm text-outline">
            Use evidence to approve validation work, community participation, or a WRS mission. The user's identity
            check runs automatically.
          </p>
          <label className="block text-label-sm">
            Activity
            <select
              className="mt-1 w-full rounded-lg bg-surface-container p-3"
              value={proof.source}
              onChange={(e) => setProof({ ...proof, source: e.target.value })}
            >
              {['validation', 'community', 'mission'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {Object.entries({
            userId: 'User ID',
            referenceId: 'Activity reference',
            evidence: 'Evidence and review reason',
            achievementCode: 'Milestone code (optional)',
          }).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={proof[key]}
              onChange={(e) => setProof({ ...proof, [key]: e.target.value })}
            />
          ))}
          <Field
            label="Reason for this check"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
          />
          <Button
            disabled={
              !recentMfa ||
              busy ||
              reason.trim().length < 3 ||
              !proof.userId.trim() ||
              !proof.referenceId.trim() ||
              proof.evidence.trim().length < 10
            }
            onClick={() => submit('rewards.activity.verify', proof)}
          >
            Check and award saved rewards
          </Button>
        </Card>
      )}
      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm">
          {message}
        </p>
      )}
    </section>
  )
}
