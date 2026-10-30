import { useRef, useState } from 'react'
import { dateValue, displayValue, humanize, fieldLabel } from '../lib/operations.js'
import RecordAction from './RecordAction.jsx'
import RecordContent, { RecordCell } from './RecordContent.jsx'
import { COLLECTIONS, rowTitle } from '../lib/collections.js'

export default function RecordWorkspace({ area, snapshot, loading, onSaved }) {
  const groupKey = area.groups[0][0]
  const config = COLLECTIONS[groupKey]
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(area.page === 'identity' ? 'pending' : 'all')
  const [page, setPage] = useState(1)
  const [selection, setSelection] = useState(null)
  const selected = selection?.snapshot === snapshot ? selection.row : null
  const setSelected = (row) => setSelection(row ? { row, snapshot } : null)
  const [busy, setBusy] = useState(false)
  const closeRef = useRef(null)
  const searchRef = useRef(null)
  const detailsRef = useRef(null)
  const pendingIdentity = area.page === 'identity' && status === 'pending'
  const identityError = pendingIdentity && snapshot?.identityChecks === null
  const rows =
    pendingIdentity && snapshot?.identityChecks !== undefined
      ? snapshot.identityChecks || []
      : snapshot?.[groupKey] || []
  const total = pendingIdentity
    ? snapshot?.userStats?.verificationPending
    : groupKey === 'users'
      ? snapshot?.userStats?.total
      : snapshot?.stats?.[groupKey]?.total
  const isUsers = groupKey === 'users'
  const statusField =
    area.page === 'identity' ? 'kyc_status' : config && 'statusField' in config ? config.statusField : 'status'
  const statuses = [
    ...new Set([
      ...(area.page === 'identity' ? ['pending'] : []),
      ...(snapshot?.[groupKey] || []).map((row) => row[statusField]).filter(Boolean),
    ]),
  ].sort()
  const filtered = rows.filter(
    (row) =>
      (status === 'all' || row[statusField] === status) &&
      Object.values(row).some((item) =>
        String(typeof item === 'object' ? JSON.stringify(item) : (item ?? ''))
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 10))
  const currentPage = Math.min(page, pages)
  const columns = (config?.columns || area.columns).filter(([key]) => area.page !== 'identity' || key !== 'kyc_status')
  const statusLabel =
    area.page === 'identity'
      ? 'Identity check'
      : groupKey === 'settlements'
        ? 'Payout status'
        : isUsers
          ? 'Account status'
          : 'Status'
  const noun = groupKey === 'support' ? 'support tickets' : area.groups[0][1].toLowerCase()
  const close = () => {
    if (!busy) {
      setSelected(null)
      closeRef.current?.focus()
    }
  }
  async function saved(message) {
    setSelected(null)
    await onSaved(message)
    requestAnimationFrame(() => {
      const target = closeRef.current
      if (target?.isConnected && !target.disabled) target.focus()
      else searchRef.current?.focus()
    })
  }
  return (
    <>
      {isUsers && (
        <div
          className={`admin-people-stats ${area.page === 'identity' ? 'is-identity' : ''}`}
          aria-label="User statistics"
        >
          {(area.page === 'identity'
            ? [
                ['verificationPending', 'Pending review'],
                ['verified', 'Verified users'],
              ]
            : [
                ['total', 'Total users'],
                ['active', 'Active accounts'],
                ['pending', 'Pending accounts'],
                ['suspended', 'Suspended'],
              ]
          ).map(([key, label]) => (
            <div key={key}>
              <span>{label}</span>
              <strong>
                {loading
                  ? '—'
                  : Number.isFinite(snapshot?.userStats?.[key])
                    ? snapshot.userStats[key].toLocaleString()
                    : 'Unavailable'}
              </strong>
            </div>
          ))}
        </div>
      )}
      {!isUsers && config?.stats && (
        <div className="admin-page-stats" aria-label={`${area.label} statistics`}>
          {config.stats.map(([key, label]) => (
            <div key={key}>
              <span>{label}</span>
              <strong>
                {loading
                  ? '—'
                  : Number.isFinite(snapshot?.stats?.[groupKey]?.[key])
                    ? snapshot.stats[groupKey][key].toLocaleString()
                    : 'Unavailable'}
              </strong>
            </div>
          ))}
        </div>
      )}
      {rows.some((row) => row.relatedDataUnavailable) && (
        <p className="admin-related-warning" role="status">
          Some names or related details could not be loaded. Refresh to try again.
        </p>
      )}
      <section className="admin-records" id={`records-${area.key}`} aria-label={`${area.label} records`}>
        <div className="admin-record-toolbar">
          <label className="admin-search">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <input
              aria-label="Search records"
              ref={searchRef}
              placeholder={isUsers ? 'Search by name, email or user reference' : `Search ${noun}`}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
                setSelected(null)
              }}
              disabled={busy}
            />
          </label>
          {area.page !== 'identity' && statusField && (
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
                setSelected(null)
              }}
              disabled={busy}
            >
              <option value="all">{area.page === 'identity' ? 'All identity checks' : 'All statuses'}</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {humanize(item)}
                </option>
              ))}
            </select>
          )}
          <span className="admin-record-count">
            {loading
              ? 'Loading…'
              : `${filtered.length} ${area.page === 'identity' ? (filtered.length === 1 ? 'identity check' : 'identity checks') : isUsers ? (filtered.length === 1 ? 'user' : 'users') : filtered.length === 1 ? 'result' : 'results'}`}
          </span>
        </div>
        {loading ? (
          <div className="admin-empty" role="status">
            <span className="admin-loader" />
            Loading…
          </div>
        ) : identityError ? (
          <div className="admin-empty" role="alert">
            <h3>Identity checks could not be loaded</h3>
            <p>Refresh to try again.</p>
          </div>
        ) : filtered.length ? (
          <>
            <div className="admin-table-wrap">
              <table className={`admin-record-table ${isUsers ? 'admin-users-table' : ''}`}>
                <thead>
                  <tr>
                    {columns.map(([key, label]) => (
                      <th key={key}>{label}</th>
                    ))}
                    {statusField && <th>{statusLabel}</th>}
                    <th>{isUsers ? 'Joined' : 'Updated'}</th>
                    <th>
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((currentPage - 1) * 10, currentPage * 10).map((row, index) => (
                    <tr key={row.id || row.user_id || index} className={selected === row ? 'is-selected' : ''}>
                      {columns.map(([key], columnIndex) => (
                        <td key={key} data-label={fieldLabel(key)} title={displayValue(key, row[key], row)}>
                          <RecordCell group={groupKey} field={key} row={row} primary={columnIndex === 0} />
                        </td>
                      ))}
                      {statusField && (
                        <td data-label={statusLabel}>
                          {row[statusField] ? (
                            <span
                              className={`admin-status ${['active', 'verified', 'approved', 'completed', 'resolved', 'paid', 'settled'].includes(row[statusField]) ? 'is-good' : ['failed', 'rejected', 'suspended'].includes(row[statusField]) ? 'is-bad' : ''}`}
                            >
                              {humanize(row[statusField])}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td data-label={isUsers ? 'Joined' : 'Updated'}>
                        {displayValue('date', isUsers ? row.created_at : dateValue(row))}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-small"
                          disabled={busy}
                          aria-expanded={selected === row}
                          aria-label={`Details for ${rowTitle(groupKey, row)}`}
                          onClick={(event) => {
                            closeRef.current = event.currentTarget
                            setSelected(row)
                            requestAnimationFrame(() => detailsRef.current?.focus())
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination">
              <span>
                {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, filtered.length)} of {filtered.length}
              </span>
              <div>
                <button
                  className="admin-btn admin-btn-small"
                  disabled={currentPage === 1 || busy}
                  onClick={() => {
                    setPage(currentPage - 1)
                    setSelected(null)
                  }}
                >
                  Previous
                </button>
                <span>
                  {currentPage} / {pages}
                </span>
                <button
                  className="admin-btn admin-btn-small"
                  disabled={currentPage === pages || busy}
                  onClick={() => {
                    setPage(currentPage + 1)
                    setSelected(null)
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="admin-empty">
            <span className="material-symbols-outlined" aria-hidden="true">
              {query || status !== 'all' ? 'search_off' : 'inbox'}
            </span>
            <h3>
              {area.page === 'identity' && status === 'pending' && !query
                ? 'No identity checks pending'
                : query || status !== 'all'
                  ? 'No matches found'
                  : `No ${noun} yet`}
            </h3>
            <p>
              {query || (status !== 'all' && area.page !== 'identity')
                ? 'Try another search or clear your filters.'
                : `${area.groups.find(([key]) => key === groupKey)?.[1]} will appear here when available.`}
            </p>
            {(query || (status !== 'all' && area.page !== 'identity')) && (
              <button
                className="admin-btn"
                onClick={() => {
                  setQuery('')
                  setStatus(area.page === 'identity' ? 'pending' : 'all')
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        {!identityError && (rows.length >= 100 || total > rows.length) && (
          <div className="admin-record-note">
            Showing {pendingIdentity ? '' : 'the latest '}
            {rows.length}
            {Number.isFinite(total)
              ? ` of ${total} ${pendingIdentity ? 'pending identity checks' : isUsers ? 'users' : 'results'}`
              : ' results'}
            . Search and filters apply to this list.
          </div>
        )}
      </section>
      {selected && (
        <div className="admin-detail-backdrop">
          <dialog
            open
            className="admin-detail-panel"
            aria-modal="true"
            aria-label="Selected record"
            tabIndex={-1}
            ref={detailsRef}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                close()
                return
              }
              if (event.key !== 'Tab') return
              const nodes = [
                ...event.currentTarget.querySelectorAll(
                  'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary',
                ),
              ]
              const first = nodes[0],
                last = nodes[nodes.length - 1]
              if (
                event.shiftKey &&
                (document.activeElement === first || document.activeElement === event.currentTarget)
              ) {
                event.preventDefault()
                last?.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first?.focus()
              }
            }}
          >
            <div className="admin-detail-header">
              <div>
                <span className="admin-eyebrow">{isUsers ? 'User account' : area.label}</span>
                <h2>{rowTitle(groupKey, selected)}</h2>
              </div>
              <button
                className="admin-btn admin-btn-small"
                disabled={busy}
                onClick={close}
                aria-label="Close record details"
              >
                Close
              </button>
            </div>
            <RecordContent group={groupKey} row={selected} />
            <details className="admin-reference-details">
              <summary>References</summary>
              <dl className="admin-detail-fields">
                {Object.entries(selected)
                  .filter(
                    ([key, value]) =>
                      value && (key.endsWith('_id') || ['id', 'operator_reference', 'version'].includes(key)),
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{fieldLabel(key)}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
              </dl>
            </details>
            <RecordAction
              key={`${groupKey}-${selected.id || selected.user_id}`}
              group={groupKey}
              row={selected}
              onSaved={saved}
              onBusyChange={setBusy}
            />
          </dialog>
        </div>
      )}
    </>
  )
}
