import { useEffect, useState } from 'react'

/**
 * Stands in for the request a screen will make once there is a backend.
 *
 * The prototype has no server, but the *states* around one are real design
 * surface — a screen that only ever renders its final data hides the loading
 * and error paths until they ship. Screens call this and handle all three.
 */
export function useMockFetch(value, { delay = 550 } = {}) {
  const requestKey = String(delay)
  const [state, setState] = useState({ key: null, data: null })

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      if (alive) setState({ key: requestKey, data: value })
    }, delay)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // `value` is static mock data; re-running on identity change would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, requestKey])

  const settled = state.key === requestKey
  return { data: settled ? state.data : null, loading: !settled }
}

/**
 * The same stand-in, but with the failure path a real request has.
 *
 * `shouldFail` is a value the *caller* controls rather than a dice roll —
 * random failures in a prototype are impossible to review and infuriating to
 * use. `retry` re-runs the request and clears the error.
 */
export function useMockRequest(value, { delay = 550, shouldFail = false } = {}) {
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${attempt}:${delay}:${shouldFail ? 'fail' : 'ok'}`
  const [state, setState] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      if (!alive) return
      if (shouldFail) {
        setState({ key: requestKey, data: null, error: 'unreachable' })
      } else {
        setState({ key: requestKey, data: value, error: null })
      }
    }, delay)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // `value` is static mock data; depending on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, shouldFail, attempt, requestKey])

  const settled = state.key === requestKey
  return {
    data: settled ? state.data : null,
    loading: !settled,
    error: settled ? state.error : null,
    retry: () => setAttempt((n) => n + 1),
  }
}

/**
 * Real connectivity, not a simulation. PRODUCT.md's user is on a patchy
 * connection, so the offline state is one they will actually meet.
 */
export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return online
}
