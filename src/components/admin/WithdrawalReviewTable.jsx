import { useMemo, useState } from 'react'
import { Badge, Button, Card, Field, Icon, List } from '../ui.jsx'
import { formatMinorUnits } from '../../lib/adminMiningApi.js'

const toneForStatus = { pending: 'gold', approved: 'tertiary', rejected: 'error', paid: 'success', failed: 'error', cancelled: 'outline' }

function normalizeStatus(value) { return String(value || 'pending').toLowerCase() }
function formatDate(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}
function maskedAccount(withdrawal) {
  const bank = withdrawal.bank || withdrawal.bankAccount || {}
  return bank.accountNumber || withdrawal.maskedAccountNumber || withdrawal.accountNumberMasked || bank.maskedAccountNumber || 'Masked account details'
}
function withdrawalAmount(withdrawal) {
  return formatMinorUnits(withdrawal.amountRbcCents || withdrawal.amountRbcMinorUnits || withdrawal.amountMinorUnits || withdrawal.amountCents || 0, 'RBC')
}

export default function WithdrawalReviewTable({ withdrawals = [], onApprove, onReject, onMarkPaid, busy = '' }) {
  const [filter, setFilter] = useState('all')
  const [activeId, setActiveId] = useState('')
  const [mode, setMode] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [payoutReference, setPayoutReference] = useState('')
  const [error, setError] = useState('')
  const items = useMemo(() => withdrawals.filter((item) => filter === 'all' || normalizeStatus(item.status) === filter), [withdrawals, filter])

  const closeAction = () => { setMode(''); setReviewNote(''); setRejectionReason(''); setPayoutReference(''); setError('') }
  const run = async (withdrawal) => {
    setError('')
    try {
      if (mode === 'approve') await onApprove?.(withdrawal.id, { reviewNote })
      if (mode === 'reject') await onReject?.(withdrawal.id, { rejectionReason, reviewNote })
      if (mode === 'paid') await onMarkPaid?.(withdrawal.id, { payoutReference, reviewNote })
      closeAction()
    } catch (requestError) { setError(requestError.message || 'Unable to update withdrawal.') }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 px-5 pb-4 pt-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-label-sm uppercase tracking-[.14em] text-on-surface-variant">Payout review</p><h2 className="mt-1 font-headline-md text-headline-md text-on-surface">Withdrawal queue</h2><p className="mt-1 text-body-sm text-on-surface-variant">Paid only records an external bank payout already completed by an administrator.</p></div><div className="flex flex-wrap gap-2">{['all', 'pending', 'approved', 'rejected', 'paid'].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-label-sm capitalize ${filter === item ? 'bg-primary-container text-white' : 'bg-white/[.05] text-on-surface-variant hover:text-on-surface'}`}>{item}</button>)}</div></div>
      {items.length === 0 ? <div className="px-5 pb-7 text-body-sm text-on-surface-variant sm:px-6">No withdrawals match this status.</div> : <List inset={false}>{items.map((withdrawal) => {
        const status = normalizeStatus(withdrawal.status)
        const expanded = activeId === withdrawal.id
        return <div key={withdrawal.id} className="px-5 py-4 sm:px-6"><button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => { setActiveId(expanded ? '' : withdrawal.id); closeAction() }} aria-expanded={expanded}><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b995ff]/15 text-[#d8c6ff]"><Icon name="account_balance" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-title text-on-surface">{withdrawalAmount(withdrawal)}</span><Badge t={toneForStatus[status] || 'outline'}>{status}</Badge></span><span className="mt-1 block truncate text-body-sm text-on-surface-variant">{withdrawal.bank?.accountName || withdrawal.accountName || 'Account holder'} · {withdrawal.bank?.name || withdrawal.bankName || 'Bank'} · {maskedAccount(withdrawal)}</span><span className="mt-1 block text-label-sm text-on-surface-variant">Requested {formatDate(withdrawal.createdAt || withdrawal.requestedAt)}</span></span><Icon name={expanded ? 'expand_less' : 'expand_more'} className="text-outline" /></button>
          {expanded ? <div className="mt-4 border-t border-white/10 pt-4"><div className="grid gap-2 text-body-sm text-on-surface-variant sm:grid-cols-2"><p><span className="text-on-surface">Review note:</span> {withdrawal.reviewNote || 'Not reviewed yet'}</p><p><span className="text-on-surface">Rejection reason:</span> {withdrawal.rejectionReason || '—'}</p><p><span className="text-on-surface">Payout reference:</span> {withdrawal.payoutReference || '—'}</p><p><span className="text-on-surface">Last reviewer:</span> {withdrawal.reviewer?.userId || withdrawal.reviewedBy || withdrawal.actorName || '—'}{withdrawal.reviewer?.role ? ` · ${withdrawal.reviewer.role}` : ''} · {formatDate(withdrawal.reviewedAt || withdrawal.updatedAt)}</p></div>
            {!mode && status === 'pending' ? <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => setMode('approve')}>Approve review</Button><Button size="sm" variant="danger" onClick={() => setMode('reject')}>Reject request</Button></div> : null}
            {!mode && status === 'approved' ? <div className="mt-4"><Button size="sm" variant="tonal" onClick={() => setMode('paid')} icon="receipt_long">Record external payout</Button></div> : null}
            {mode ? <div className="mt-4 rounded-xl border border-white/12 bg-white/[.035] p-4"><p className="text-title-sm text-on-surface">{mode === 'approve' ? 'Approve withdrawal' : mode === 'reject' ? 'Reject withdrawal' : 'Record completed external payout'}</p>{mode === 'reject' ? <Field className="mt-3" label="Rejection reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Explain what the member needs to correct" maxLength="500" /> : null}{mode === 'paid' ? <Field className="mt-3" label="External payout reference" value={payoutReference} onChange={(event) => setPayoutReference(event.target.value)} placeholder="Bank or settlement reference" maxLength="160" /> : null}<Field className="mt-3" label="Reviewer note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Required audit note" maxLength="500" />{error ? <p role="alert" className="mt-2 text-label-sm text-error">{error}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant={mode === 'reject' ? 'danger' : 'primary'} loading={busy === `${mode}-${withdrawal.id}`} onClick={() => run(withdrawal)}>{mode === 'approve' ? 'Confirm approval' : mode === 'reject' ? 'Confirm rejection' : 'Confirm payout recorded'}</Button><Button size="sm" variant="quiet" onClick={closeAction}>Cancel</Button></div></div> : null}
          </div> : null}
        </div>
      })}</List>}
    </Card>
  )
}
