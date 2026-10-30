import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../src/components/auth/AuthProvider.jsx'
import { browserAccountClient } from '../../../src/infrastructure/account/browserAccountClient.ts'
import { hasRecentMfa } from '../../../src/domain/auth/policy.ts'
import AdminShell from '../components/AdminShell.jsx'
import AdminOverview from '../components/AdminOverview.jsx'
import RecordWorkspace from '../components/RecordWorkspace.jsx'
import MfaPrompt from '../components/MfaPrompt.jsx'
import { areasForRoles, pageForArea } from '../lib/operations.js'
import { securitySettingsUrl } from '../lib/externalRoutes.js'

const RewardRulesEditor = lazy(() => import('../../../src/components/mining/RewardRulesEditor.jsx'))
const OperatorAccessPanel = lazy(() => import('../../../src/components/admin/OperatorAccessPanel.jsx'))

export default function Operations() {
  const auth = useAuth()
  const areas = useMemo(() => areasForRoles(auth.session?.roles), [auth.session?.roles])
  const [params, setParams] = useSearchParams()
  const scopeArea = areas.find(({ key }) => key === params.get('scope')) || areas[0]
  const area = pageForArea(scopeArea, params.get('page'))
  const scope = area?.key || 'overview'
  const pageKey = `${scope}-${area?.page || scope}`
  const currentPage = useRef(pageKey)
  currentPage.current = pageKey
  const requestId = useRef(0)
  const currentScope = useRef(scope)
  const [result, setResult] = useState({ scope: '', snapshot: null, loading: true, error: '' })
  const [notice, setNotice] = useState({ scope: '', message: '' })
  const load = useCallback(async (nextScope) => {
    if (currentScope.current !== nextScope) return
    const id = ++requestId.current
    setResult((current) => ({
      ...current,
      scope: nextScope,
      snapshot: current.scope === nextScope ? current.snapshot : null,
      loading: true,
      error: '',
    }))
    try {
      const snapshot = await browserAccountClient.operations(nextScope)
      if (requestId.current === id)
        setResult({
          scope: nextScope,
          snapshot,
          loading: false,
          error: '',
        })
      return true
    } catch (error) {
      if (requestId.current === id)
        setResult((current) => ({
          ...current,
          loading: false,
          error: error.message || 'This page could not be loaded.',
        }))
      return false
    }
  }, [])
  useEffect(() => {
    currentScope.current = scope
    if (scope !== 'access' && areas.length) void load(scope)
    return () => {
      requestId.current += 1
    }
  }, [scope, load, areas.length])
  const snapshot = result.scope === scope ? result.snapshot : null
  const loading = scope !== 'access' && (result.scope !== scope || result.loading)
  const error = result.scope === scope ? result.error : ''
  const recentMfa = auth.session ? hasRecentMfa(auth.session) : false
  async function saved(message) {
    if (currentScope.current !== scope) return
    if (currentPage.current === pageKey) setNotice({ scope: pageKey, message })
    await load(scope)
  }
  if (!area)
    return (
      <AdminShell title="Admin">
        <div className="admin-empty">
          <h2>Team access required</h2>
          <p>This account has no admin pages assigned.</p>
        </div>
      </AdminShell>
    )
  return (
    <AdminShell
      title={area.label}
      subtitle={area.description}
      showPageHeader={scope !== 'overview'}
      actions={
        scope !== 'access' && (
          <button className="admin-btn" disabled={loading} onClick={() => load(scope)}>
            <span className="material-symbols-outlined" aria-hidden="true">
              refresh
            </span>
            Refresh
          </button>
        )
      }
    >
      {notice.scope === pageKey && notice.message && (
        <div className="admin-notice" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">
            check_circle
          </span>
          {notice.message}
          <button aria-label="Dismiss notification" onClick={() => setNotice({ scope, message: '' })}>
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="admin-error-banner" role="alert">
          <div>
            <strong>Could not refresh this page</strong>
            <p>{error}</p>
          </div>
          <button className="admin-btn" disabled={loading} onClick={() => load(scope)}>
            Try again
          </button>
        </div>
      )}
      {scope === 'overview' ? (
        <AdminOverview
          summary={snapshot?.summary}
          loading={loading}
          areas={areas}
          onOpen={(nextScope, page) => setParams({ scope: nextScope, ...(page ? { page } : {}) })}
          onRetry={() => load(scope)}
        />
      ) : scope === 'rewards' || scope === 'access' ? (
        <div className="admin-management">
          {!recentMfa && <MfaPrompt />}
          <Suspense
            fallback={
              <div className="admin-empty" role="status">
                Loading controls…
              </div>
            }
          >
            {scope === 'access' ? (
              <OperatorAccessPanel compact recentMfa={recentMfa} actorUserId={auth.session.userId} />
            ) : loading && !snapshot ? (
              <div className="admin-empty" role="status">
                Loading reward settings…
              </div>
            ) : snapshot ? (
              <RewardRulesEditor
                compact
                snapshot={snapshot}
                onReload={async () => {
                  if (!(await load(scope))) throw new Error('Reward settings could not be refreshed. Try again.')
                }}
                recentMfa={recentMfa}
                securitySettingsHref={securitySettingsUrl}
              />
            ) : (
              <div className="admin-empty admin-panel">
                <h3>Reward settings unavailable</h3>
                <p>Refresh to load saved rules before making changes.</p>
              </div>
            )}
          </Suspense>
        </div>
      ) : error && !snapshot ? (
        <div className="admin-empty admin-panel">
          <h3>This page is unavailable</h3>
          <p>Choose Try again to load this page.</p>
        </div>
      ) : (
        <RecordWorkspace
          key={`${scope}-${area.page}`}
          area={area}
          snapshot={snapshot}
          loading={loading}
          onSaved={saved}
        />
      )}
    </AdminShell>
  )
}
