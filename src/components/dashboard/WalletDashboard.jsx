import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { browserFinanceClient } from '../../infrastructure/finance/browserFinanceClient.ts'
import { atomicUnitsToDecimal } from '../../domain/mining/metrics.ts'
import DashboardIcon, { AssetCoin } from './DashboardIcon.jsx'
import DailyMiningProgress, { MiningControl } from './DailyMiningProgress.jsx'
import { dashboardActivity, activityAmount } from './dashboardActivity.js'

export function useDashboardLedger(enabled, refreshKey = 0) {
  const [ledger, setLedger] = useState(null)
  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    Promise.allSettled([browserFinanceClient.wallet('USD'), browserFinanceClient.transactions('USD')]).then(
      ([balance, history]) => {
        if (!active) return
        setLedger({
          loading: false,
          wallet: balance.status === 'fulfilled' ? balance.value?.wallet || null : null,
          transactions:
            history.status === 'fulfilled' && Array.isArray(history.value?.transactions)
              ? history.value.transactions
              : [],
          error: balance.status === 'rejected' ? 'Wallet balance unavailable' : '',
          historyError: history.status === 'rejected' ? 'Activity is temporarily unavailable.' : '',
        })
      },
    )
    return () => {
      active = false
    }
  }, [enabled, refreshKey])
  return enabled
    ? ledger || { loading: true, wallet: null, transactions: [] }
    : { loading: false, wallet: null, transactions: [] }
}

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100)
}

function atomic(value, scale) {
  if (value === null || value === undefined || !Number.isInteger(scale)) return null
  try {
    const [whole, fraction = ''] = atomicUnitsToDecimal(String(value), scale).split('.')
    return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`
  } catch {
    return null
  }
}

function WalletAction({ icon, label, tone, onClick, to }) {
  const contents = (
    <>
      <DashboardIcon name={icon} />
      <span>{label}</span>
    </>
  )
  return to ? (
    <Link to={to} className={`dw-action dw-action-${tone}`}>
      {contents}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={`dw-action dw-action-${tone}`}>
      {contents}
    </button>
  )
}

function ActivityList({ transactions = [], hidden, historyError, mining = false, onViewAll, warning }) {
  const shown = transactions.slice(0, 3)
  return (
    <section className="dw-panel dw-history" aria-label={mining ? 'RoboCoin transactions' : 'Recent transactions'}>
      <div className="dw-panel-heading">
        <h2>{mining ? 'Transaction History' : 'Recent Transactions'}</h2>
        {onViewAll ? (
          <button type="button" onClick={onViewAll}>
            View All
          </button>
        ) : (
          <Link to="/wallet/transactions">View All</Link>
        )}
      </div>
      {historyError ? (
        <p className="dw-empty" role="status">
          {historyError}
        </p>
      ) : shown.length ? (
        <div className="dw-transaction-list">
          {shown.map((tx) => {
            const credit = tx.direction === 'credit'
            const label = String(tx.kind || 'Transaction').replace(/[_-]/g, ' ')
            const icon =
              tx.currency === 'XP'
                ? 'star'
                : /mining/i.test(label)
                  ? 'mine'
                  : /reward|referral/i.test(label)
                    ? 'gift'
                    : 'transfer'
            const date = new Date(tx.createdAt)
            const amount = activityAmount(tx)
            return (
              <div className="dw-transaction" key={tx.id}>
                <span className={`dw-transaction-icon ${icon}`}>
                  <DashboardIcon name={icon} />
                </span>
                <div className="dw-transaction-title">
                  <h3>{label}</h3>
                  <p>{tx.reference || tx.status || 'Wallet activity'}</p>
                </div>
                <div className="dw-transaction-value">
                  <strong
                    className={tx.currency === 'XP' && credit ? 'dw-xp-amount' : credit ? 'dw-positive' : 'dw-negative'}
                  >
                    {hidden ? '••••' : amount}
                  </strong>
                  <span>
                    {Number.isNaN(date.getTime())
                      ? tx.status
                      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                        ', ' +
                        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="dw-empty-activity">
          <span>
            <DashboardIcon name="clock" size={26} />
          </span>
          <p>
            No transactions yet<small>Your rewards and wallet activity will appear here.</small>
          </p>
        </div>
      )}
      {warning && (
        <p className="dw-inline-warning" role="status">
          {warning}
        </p>
      )}
    </section>
  )
}

function MiningSummary({ mining, hidden }) {
  const last = mining?.recentSessions?.find((s) => s.status === 'settled')
  const active = mining?.session?.status === 'active'
  const rate = active ? atomic(mining.session.rule?.rateAtomicPerHour, mining.session.rule?.atomicUnitScale) : null
  const lastAward = atomic(last?.estimatedAwardAtomic, last?.rule?.atomicUnitScale)
  const confirmedBalance = atomic(mining?.balance?.availableAtomic, mining?.balance?.atomicScale)
  return (
    <section className="dw-panel dw-mining-summary">
      <Link to="/deploy" className="dw-panel-heading">
        <h2>
          <DashboardIcon name="mine" />
          My Mining Summary
        </h2>
        <DashboardIcon name="chevron" size={17} />
      </Link>
      <dl>
        <div>
          <dt>
            <DashboardIcon name="mine" size={16} />
            Current Rate
          </dt>
          <dd className={rate === null ? undefined : 'dw-positive'}>
            {hidden ? '••••' : !mining ? 'Unavailable' : rate === null ? 'Not mining' : `${rate} RBC / hour`}
          </dd>
        </div>
        <div>
          <dt>
            <DashboardIcon name="clock" size={16} />
            Last Cycle
          </dt>
          <dd>{hidden ? '••••' : lastAward ? `${lastAward} RBC` : 'No completed cycle'}</dd>
        </div>
        <div>
          <dt>
            <DashboardIcon name="layers" size={16} />
            Available RoboCoin
          </dt>
          <dd>{hidden ? '••••' : confirmedBalance === null ? '—' : `${confirmedBalance} RBC`}</dd>
        </div>
        <div>
          <dt>
            <DashboardIcon name="robot" size={16} />
            Mining Level
          </dt>
          <dd>
            <span className="dw-level">{mining?.level?.name || (mining ? 'Getting started' : 'Unavailable')}</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}

const ACTION_COPY = {
  Deposit: ['Deposit funds', 'Direct wallet deposits are not available yet.'],
  Transfer: [
    'Transfer funds',
    'Wallet transfers are not available for this account yet. Your available balance is ready to view in your wallet.',
    'Open wallet',
    '/wallet',
  ],
  Convert: [
    'Convert assets',
    'RoboCoin conversion is not available yet. Your RBC and cash balances are held separately.',
    'View wallet activity',
    '/wallet/transactions',
  ],
  Send: [
    'Send RoboCoin',
    'RoboCoin transfers are not available yet. Your mining rewards remain in your account.',
    'Explore mining',
    '/deploy',
  ],
  Receive: [
    'Receive RoboCoin',
    'Earn RoboCoin through mining and eligible rewards. External wallet deposits are not available yet.',
    'Start mining',
    '/deploy',
  ],
  Swap: [
    'Swap RoboCoin',
    'RoboCoin swaps are not available yet. There is no confirmed exchange rate for your account.',
    'View rewards',
    '/rewards',
  ],
  'Buy RBC': [
    'Get RoboCoin',
    'Earn RoboCoin by mining with your robot. Direct RoboCoin purchases are not available yet.',
    'Explore mining',
    '/deploy',
  ],
  Info: [
    'About RoboCoin',
    'RoboCoin (RBC) is the WRS utility and reward coin. Mine with your robot, build your skills, and track your confirmed rewards here.',
    'Explore rewards',
    '/rewards',
  ],
}

function ActionDialog({ action, onClose, transactions, hidden, emptyMessage }) {
  const dialog = useRef(null)
  useEffect(() => {
    if (action) dialog.current?.showModal?.()
    else dialog.current?.close?.()
  }, [action])
  const copy = ACTION_COPY[action]
  return (
    <dialog ref={dialog} className="dw-dialog" onCancel={onClose} aria-labelledby="wallet-action-title">
      <button type="button" className="dw-icon-button dw-dialog-close" onClick={onClose} aria-label="Close dialog">
        <DashboardIcon name="close" />
      </button>
      <span className="dw-dialog-symbol">
        <DashboardIcon name={action === 'History' ? 'clock' : 'wallet'} size={30} />
      </span>
      <h2 id="wallet-action-title">{copy?.[0] || 'All recent activity'}</h2>
      {copy ? (
        <>
          <p>{copy[1]}</p>
          {copy[2] && copy[3] && (
            <Link className="dw-primary-button" to={copy[3]} onClick={onClose}>
              {copy[2]}
              <DashboardIcon name="chevron" size={16} />
            </Link>
          )}
        </>
      ) : action === 'History' ? (
        <div className="dw-full-history">
          {transactions.length ? (
            transactions.map((tx) => (
              <div className="dw-full-history-row" key={tx.id}>
                <span>
                  {String(tx.kind).replace(/[_-]/g, ' ')}
                  <small>
                    {Number.isFinite(Date.parse(tx.createdAt))
                      ? new Date(tx.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : tx.status}
                  </small>
                </span>
                <strong>{hidden ? '••••' : activityAmount(tx)}</strong>
              </div>
            ))
          ) : (
            <p>{emptyMessage || 'No wallet activity yet.'}</p>
          )}
        </div>
      ) : null}
    </dialog>
  )
}

export default function WalletDashboard({
  rbc = null,
  xp = null,
  mining = null,
  robot = null,
  ledger = {},
  loading = false,
  balanceState,
  onWithdraw,
  pendingMining = false,
  now,
  shortcuts,
  rewards,
  rewardsError,
  progress,
  progressError,
  onRefreshData,
  onStartMining,
  miningStarting,
  onRefreshMining,
  miningRefreshing,
  miningError,
  robotLoading,
}) {
  const [hidden, setHidden] = useState(false)
  const [action, setAction] = useState(null)
  const wallet = ledger.wallet
  const currency = wallet?.currency || 'USD'
  const fiat = wallet && Number.isSafeInteger(wallet.availableMinor) ? money(wallet.availableMinor, currency) : null
  const rbcDisplay = hidden ? '••••' : rbc
  const xpDisplay = hidden ? '••••' : xp
  const recent = dashboardActivity(rewards, ledger.transactions)
  const activityWarning = [rewardsError, ledger.historyError].filter(Boolean).join(' ')
  const unavailable = balanceState === 'empty' ? 'No verified balance' : 'Balance unavailable'

  return (
    <div className="dw-dashboard dw-home-dashboard">
      <div className="dw-overview">
        <h1 className="sr-only">Home</h1>
        <section className="dw-balance-card" aria-label="Wallet balance">
          <div className="dw-balance-content">
            <div className="dw-balance-label">
              <span>Available Balance ({currency})</span>
              <button
                className="dw-icon-button"
                type="button"
                aria-label={hidden ? 'Show balances' : 'Hide balances'}
                aria-pressed={hidden}
                onClick={() => setHidden(!hidden)}
              >
                <DashboardIcon name={hidden ? 'hidden' : 'eye'} size={18} />
              </button>
            </div>
            <p className={`dw-total ${!fiat && !ledger.loading ? 'dw-total-unavailable' : ''}`} aria-live="polite">
              {hidden ? '••••••' : ledger.loading ? <span className="dw-skeleton" /> : fiat || '—'}
            </p>
            <span className="dw-balance-caption">
              <span />
              {ledger.loading
                ? 'Updating your wallet'
                : fiat
                  ? 'Available in your wallet'
                  : 'Connect your wallet to get started'}
            </span>
            <MiningControl
              mining={mining}
              now={now}
              hasRobot={Boolean(robot?.id || mining?.robots?.some((item) => item.unlocked))}
              robotLoading={robotLoading}
              loading={loading}
              onStart={onStartMining}
              starting={miningStarting}
              onRefresh={onRefreshMining}
              refreshing={miningRefreshing}
              error={miningError}
            />
          </div>
          <img className="dw-balance-robot" src="/dashboard/wallet-robot.png" alt="" />
          <span className="dw-orbit dw-orbit-one" />
          <span className="dw-orbit dw-orbit-two" />
        </section>

        <section
          className="dw-assets"
          aria-label="Member balances"
          role={loading ? 'status' : undefined}
          aria-busy={loading || undefined}
        >
          <Link className="dw-asset dw-asset-rbc" to="/wallet" aria-label="Open RoboCoin wallet">
            <AssetCoin />
            <h2 aria-label="RoboCoin balance">RoboCoin</h2>
            <strong className={!rbc && !hidden ? 'dw-unknown' : ''}>
              {loading ? <span className="dw-skeleton" /> : rbcDisplay?.replace(/ RBC$/, '') || unavailable}
            </strong>
            <span className="dw-asset-corner">
              <DashboardIcon name="chevron" size={12} />
            </span>
          </Link>
          <Link className="dw-asset dw-asset-cash" to="/wallet#withdraw" onClick={onWithdraw}>
            <AssetCoin kind="cash" />
            <h2>Earnings</h2>
            <strong className={!fiat && !hidden ? 'dw-unknown' : ''}>
              {ledger.loading ? <span className="dw-skeleton" /> : hidden ? '••••' : fiat || 'Unavailable'}
            </strong>
          </Link>
          <Link className="dw-asset dw-asset-xp" to="/rewards">
            <AssetCoin kind="xp" />
            <h2 aria-label="XP balance">Points / XP</h2>
            <strong className={!xp && !hidden ? 'dw-unknown' : ''}>
              {loading ? <span className="dw-skeleton" /> : xpDisplay || 'Unavailable'}
            </strong>
          </Link>
        </section>

        <div className="dw-actions" aria-label="Wallet actions">
          <WalletAction icon="down" label="Deposit" tone="blue" onClick={() => setAction('Deposit')} />
          <WalletAction
            icon="up"
            label="Withdraw"
            tone="red"
            onClick={onWithdraw}
            to={onWithdraw ? undefined : '/wallet#withdraw'}
          />
          <WalletAction icon="transfer" label="Transfer" tone="teal" onClick={() => setAction('Transfer')} />
          <WalletAction icon="swap" label="Convert" tone="purple" onClick={() => setAction('Convert')} />
        </div>

        <DailyMiningProgress
          data={progress}
          mining={mining}
          now={now}
          loading={loading}
          error={progressError}
          onRefresh={onRefreshData}
        />
        {shortcuts && <div className="dw-shortcuts-slot">{shortcuts}</div>}
        <ActivityList
          transactions={recent}
          hidden={hidden}
          historyError={recent.length ? undefined : activityWarning}
          warning={recent.length ? activityWarning : undefined}
          onViewAll={() => setAction('History')}
        />
        <div className="dw-wallet-footnote">
          <DashboardIcon name="shield" size={14} />
          <span>
            {pendingMining
              ? 'RBC includes estimated earnings until the cycle settles.'
              : 'Your wallet. Your robot. Your possibilities.'}
          </span>
        </div>
      </div>

      <ActionDialog
        action={action}
        onClose={() => setAction(null)}
        transactions={recent}
        hidden={hidden}
        emptyMessage={activityWarning}
      />
    </div>
  )
}

export function RoboCoinWallet({
  rbc = null,
  mining = null,
  ledger = {},
  loading = false,
  onWithdraw,
  cashAvailable = true,
}) {
  const [hidden, setHidden] = useState(false)
  const [action, setAction] = useState(null)
  const rbcDisplay = hidden ? '••••' : rbc
  const currency = ledger.wallet?.currency || 'USD'
  const fiat = Number.isSafeInteger(ledger.wallet?.availableMinor)
    ? money(ledger.wallet.availableMinor, currency)
    : null
  const recentRbc = (mining?.recentSessions || [])
    .filter((session) => session.status === 'settled')
    .map((session) => ({
      id: session.id,
      kind: 'mining_reward',
      reference: 'Completed cycle · estimated reward',
      direction: 'credit',
      currency: 'RBC',
      amountRbc: atomic(session.estimatedAwardAtomic, session.rule?.atomicUnitScale),
      createdAt: session.settledAt || session.endsAt,
      status: 'Settled',
    }))

  return (
    <div className="dw-dashboard dw-wallet-dashboard">
      <section className="dw-detail" aria-label="RoboCoin wallet">
        <section className="dw-rbc-card">
          <div className="dw-rbc-title">
            <AssetCoin />
            <div>
              <h3>RoboCoin (RBC)</h3>
              <p>WRS Utility & Reward Coin</p>
            </div>
            <button
              className="dw-icon-button"
              type="button"
              onClick={() => setAction('Info')}
              aria-label="About RoboCoin"
            >
              <DashboardIcon name="info" size={20} />
            </button>
          </div>
          <div className="dw-rbc-balance">
            <div className="dw-rbc-balance-label">
              <p>Available Balance</p>
              <button
                className="dw-icon-button"
                type="button"
                aria-label={hidden ? 'Show balances' : 'Hide balances'}
                aria-pressed={hidden}
                onClick={() => setHidden(!hidden)}
              >
                <DashboardIcon name={hidden ? 'hidden' : 'eye'} size={17} />
              </button>
            </div>
            <strong>{loading ? <span className="dw-skeleton" /> : rbcDisplay || '— RBC'}</strong>
            <span>Earn. Build. Be part of the future.</span>
          </div>
          <img className="dw-coin-art" src="/dashboard/robocoin.svg" alt="" />
          <div className="dw-actions dw-rbc-actions">
            {[
              ['send', 'Send', 'blue'],
              ['receive', 'Receive', 'blue'],
              ['swap', 'Swap', 'purple'],
              ['cart', 'Buy RBC', 'purple'],
            ].map(([icon, label, tone]) => (
              <WalletAction key={label} icon={icon} label={label} tone={tone} onClick={() => setAction(label)} />
            ))}
          </div>
        </section>
        <MiningSummary mining={mining} hidden={hidden} />
        <ActivityList transactions={recentRbc} hidden={hidden} mining onViewAll={() => setAction('History')} />
        <Link className="dw-explore" to="/rewards">
          <span className="dw-explore-icon">
            <DashboardIcon name="gift" size={23} />
          </span>
          <span>
            More ways to earn<small>Explore your rewards & opportunities</small>
          </span>
          <DashboardIcon name="chevron" size={17} />
        </Link>
      </section>

      {cashAvailable ? (
        <section className="dw-panel dw-cash-wallet" aria-label="Wallet balance">
          <div className="dw-cash-wallet-balance">
            <span>
              Cash Wallet <small>{currency}</small>
            </span>
            <strong aria-live="polite">{hidden ? '••••' : ledger.loading ? 'Loading…' : fiat || 'Unavailable'}</strong>
            <button type="button" className="dw-primary-button" onClick={onWithdraw}>
              Withdraw
            </button>
          </div>
          <details className="dw-cash-history">
            <summary>
              Cash transactions
              <DashboardIcon name="chevron" size={16} />
            </summary>
            <ActivityList transactions={ledger.transactions || []} hidden={hidden} historyError={ledger.historyError} />
          </details>
        </section>
      ) : (
        <section className="dw-panel dw-verification-panel">
          <DashboardIcon name="shield" size={23} />
          <div>
            <h2>Cash wallet</h2>
            <p>Verify your identity to use the cash wallet.</p>
          </div>
          <Link to="/settings">
            Verify identity
            <DashboardIcon name="chevron" size={15} />
          </Link>
        </section>
      )}
      <ActionDialog action={action} onClose={() => setAction(null)} transactions={recentRbc} hidden={hidden} />
    </div>
  )
}
