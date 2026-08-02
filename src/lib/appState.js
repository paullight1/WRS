import { useEffect, useState } from 'react'

/**
 * Stands in for the request a screen will make once there is a backend.
 *
 * The prototype has no server, but the *states* around one are real design
 * surface — a screen that only ever renders its final data hides the loading
 * and error paths until they ship. Screens call this and handle all three.
 */
export function useMockFetch(value, { delay = 550 } = {}) {
  const [state, setState] = useState({ data: null, loading: true })

  useEffect(() => {
    let alive = true
    setState({ data: null, loading: true })
    const t = setTimeout(() => {
      if (alive) setState({ data: value, loading: false })
    }, delay)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // `value` is static mock data; re-running on identity change would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay])

  return state
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
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let alive = true
    setState({ data: null, loading: true, error: null })
    const t = setTimeout(() => {
      if (!alive) return
      if (shouldFail) {
        setState({ data: null, loading: false, error: 'unreachable' })
      } else {
        setState({ data: value, loading: false, error: null })
      }
    }, delay)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // `value` is static mock data; depending on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, shouldFail, attempt])

  return { ...state, retry: () => setAttempt((n) => n + 1) }
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
