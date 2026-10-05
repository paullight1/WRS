import { useState } from 'react'
import { Field, Icon } from '../ui.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { Card } from '../ui/card.jsx'
import { activityPresets, decimalToAtomic, minerLevelPresets } from '../../domain/mining/rewardPolicy.ts'
import { browserAccountClient } from '../../infrastructure/account/browserAccountClient.ts'

export default function RewardRulesEditor({ snapshot, onReload, recentMfa }) {
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
  const [reason, setReason] = useState('Apply WRS XP progression and qualified RBC reward policy')
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
  const selectedSavedRule = (snapshot?.rules || []).find((rule) => rule.id === selectedRule)
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
      await onReload()
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/10 bg-primary/[.035] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
            <Icon name="tune" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Policy studio</h3>
            <p className="mt-1 max-w-xl text-xs leading-5 text-on-surface-variant">
              Configure XP progression and eligible RoboCoin issuance. Values in the editor are draft inputs until saved
              and activated.
            </p>
          </div>
        </div>
        <Badge variant={recentMfa ? 'success' : 'warning'}>{recentMfa ? 'Ready to edit' : 'Fresh MFA required'}</Badge>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-[#f7c948]/15 bg-[#f7c948]/[.035] px-4 py-3">
        <Icon name="info" className="mt-0.5 text-[18px] text-[#f7c948]" />
        <p className="text-xs leading-5 text-on-surface-variant">
          XP activity rewards and miner levels are unsaved examples for a draft. Review them before saving; they are not
          active policy.
        </p>
      </div>
      <Card className="space-y-3 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Activity rewards</h3>
            <p className="mt-1 text-xs text-outline">Configure progress credit for verified work.</p>
          </div>
          <Badge variant="secondary">{activities.length} sources</Badge>
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
                : 'Requires an approved contribution, passed assessment, verified event or qualified referral.'}
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
                label="XP required"
                type="number"
                min="0"
                value={level.requiredXp}
                onChange={(e) => updateLevel(level.level, 'requiredXp', Number(e.target.value))}
              />
              <Field
                label="Mining multiplier"
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={level.multiplierBps / 10000}
                onChange={(e) => updateLevel(level.level, 'multiplierBps', Math.round(Number(e.target.value) * 10000))}
              />
              <Field
                label="Approved activities required"
                type="number"
                min="0"
                value={level.requiredVerifiedActivityCount}
                onChange={(e) => updateLevel(level.level, 'requiredVerifiedActivityCount', Number(e.target.value))}
              />
              <Field
                label="Required achievements (comma separated)"
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
          <p className="mt-1 text-xs text-outline">Guardrails for every configured issuance event.</p>
        </div>
        <p className="text-body-sm text-outline">
          Enter the approved rate, activity rewards, precision, and issuance limits. Leave every mining field blank to
          save an XP-only draft.
        </p>
        {Object.entries({
          hourly: 'Base RBC per hour (1×)',
          powerBonus: 'Extra RBC per hour for each contribution power unit',
          sessionCap: 'Maximum RBC per mining cycle',
          dailyCap: 'Maximum RBC per member per day',
          globalCap: 'Total RBC issuance limit',
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
        <Field label="Reason for this change" value={reason} onChange={(e) => setReason(e.target.value)} />
        {!recentMfa && (
          <div className="space-y-2">
            <p className="text-body-sm text-outline">
              Confirm your authenticator before saving or activating reward settings.
            </p>
            <Button to="/settings/security" variant="secondary">
              Set up authenticator
            </Button>
          </div>
        )}
        <Button full disabled={!recentMfa || busy} loading={busy} onClick={save}>
          Save draft rule
        </Button>
        <label className="block text-label-sm">
          Saved rule
          <select
            className="mt-1 w-full rounded-lg bg-surface-container p-3"
            value={selectedRule}
            onChange={(e) => setSelectedRule(e.target.value)}
          >
            <option value="">Select a rule</option>
            {(snapshot?.rules || []).map((rule) => (
              <option key={rule.id} value={rule.id}>
                Version {rule.version} · {rule.status}
                {rule.issuanceEnabled ? ' · RBC enabled' : ''}
              </option>
            ))}
          </select>
        </label>
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
              disabled={!recentMfa || !selectedRule || busy || (action === 'rewards.issuance.enable' && !canEnableRbc)}
              onClick={() => submit(action, { ruleId: selectedRule })}
            >
              {label}
            </Button>
          ))}
        </div>
      </Card>
      <Card className="space-y-3 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-on-surface">Verify a contribution or achievement</h3>
          <p className="mt-1 text-xs text-outline">Record reviewed evidence against a member account.</p>
        </div>
        <p className="text-body-sm text-outline">
          Use evidence to approve validation work, community participation or a WRS mission. Account verification is
          checked automatically.
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
          userId: 'Member ID',
          referenceId: 'Activity reference',
          evidence: 'Evidence and review reason',
          achievementCode: 'Achievement code (optional)',
        }).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={proof[key]}
            onChange={(e) => setProof({ ...proof, [key]: e.target.value })}
          />
        ))}
        <Button
          disabled={!recentMfa || busy || proof.evidence.length < 10}
          onClick={() => submit('rewards.activity.verify', proof)}
        >
          Verify and award configured rewards
        </Button>
      </Card>
      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm">
          {message}
        </p>
      )}
    </section>
  )
}
