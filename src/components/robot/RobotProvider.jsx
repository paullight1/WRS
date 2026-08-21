import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { browserRobotClient } from '../../infrastructure/robot/browserRobotClient.ts'
import { packageDefinition } from '../../domain/robot/packages.ts'
import { runtimeConfig } from '../../lib/runtimeConfig.js'

const RobotContext = createContext(null)
const DEMO_KEY = 'wrs.demo.robot-state.v1'

const defaultDemoDraft = {
  step: 0,
  requestedPackageSlug: 'professional',
  name: 'WRS-Pro-001',
  palette: 'Oceania Flow',
  parts: {
    head: 'phantom',
    chassis: 'carbon',
    optics: 'lidar360',
    actuators: 'titan',
    power: 'quantum',
  },
  personality: 'Logical',
  tuning: { speed: 70, battery: 75, sensor: 68 },
  voiceProfileId: 'standard-en',
}

const emptyState = { robot: null, configuration: null, onboarding: null }

function readDemoState() {
  if (typeof window === 'undefined') {
    return { robot: null, configuration: null, onboarding: defaultDemoDraft }
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DEMO_KEY) || 'null')
    if (parsed && typeof parsed === 'object') {
      return {
        robot: parsed.robot || null,
        configuration: parsed.configuration || null,
        onboarding: parsed.onboarding || defaultDemoDraft,
      }
    }
  } catch {
    // Corrupt demo state is discarded rather than trusted.
  }
  return { robot: null, configuration: null, onboarding: defaultDemoDraft }
}

function writeDemoState(next) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DEMO_KEY, JSON.stringify(next))
  }
}

function buildDemoPassport(robot, configuration) {
  if (!robot || !configuration) return null
  return {
    authoritative: false,
    robotId: robot.id,
    publicVerificationId: robot.publicVerificationId,
    name: robot.name,
    robotClass: packageDefinition(robot.packageSlug).robotClass,
    packageSlug: robot.packageSlug,
    lifecycle: robot.lifecycle,
    activationDate: robot.activationDate,
    level: 1,
    totalXp: 0,
    issuedAt: robot.createdAt,
    skills: [],
    certifications: [],
    history: [],
  }
}

export function RobotProvider({ children }) {
  const auth = useAuth()
  const [state, setState] = useState(() => (runtimeConfig.isDemo ? readDemoState() : emptyState))
  const [loading, setLoading] = useState(() => !runtimeConfig.isDemo)
  const [error, setError] = useState('')

  const persistDemo = (patch) => {
    const next = { ...readDemoState(), ...patch }
    writeDemoState(next)
    setState(next)
    return next
  }

  const refresh = async () => {
    if (!auth.session?.userId) {
      setState(emptyState)
      setError('')
      setLoading(false)
      return null
    }
    if (runtimeConfig.isDemo) {
      const demo = readDemoState()
      setState(demo)
      setError('')
      setLoading(false)
      return demo
    }
    if (!runtimeConfig.services.robots) {
      setState(emptyState)
      setError('Authoritative robot service is unavailable.')
      setLoading(false)
      return null
    }

    setLoading(true)
    try {
      const [active, draft] = await Promise.all([browserRobotClient.active(), browserRobotClient.onboarding()])
      const next = {
        robot: active.robot,
        configuration: active.configuration,
        onboarding: draft.draft,
      }
      setState(next)
      setError('')
      return next
    } catch (reason) {
      setState(emptyState)
      setError(reason instanceof Error ? reason.message : 'Unable to load robot state.')
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (runtimeConfig.isDemo) return undefined
    let active = true

    if (!auth.session?.userId) {
      Promise.resolve().then(() => {
        if (!active) return
        setState(emptyState)
        setError('')
        setLoading(false)
      })
      return () => {
        active = false
      }
    }

    if (!runtimeConfig.services.robots) {
      Promise.resolve().then(() => {
        if (!active) return
        setState(emptyState)
        setError('Authoritative robot service is unavailable.')
        setLoading(false)
      })
      return () => {
        active = false
      }
    }

    Promise.all([browserRobotClient.active(), browserRobotClient.onboarding()])
      .then(([robotResult, draftResult]) => {
        if (!active) return
        setState({
          robot: robotResult.robot,
          configuration: robotResult.configuration,
          onboarding: draftResult.draft,
        })
        setError('')
      })
      .catch((reason) => {
        if (!active) return
        setState(emptyState)
        setError(reason instanceof Error ? reason.message : 'Unable to load robot state.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [auth.session?.userId])

  const robot = state.robot
  const configuration = state.configuration
  const onboarding = state.onboarding

  const api = {
    robot,
    configuration,
    onboarding,
    loading,
    error,
    isDemo: runtimeConfig.isDemo,
    authoritative: !runtimeConfig.isDemo && runtimeConfig.services.robots,
    refresh,
    async saveOnboardingDraft(draft) {
      if (!auth.session?.userId) throw new Error('Authentication is required.')
      if (runtimeConfig.isDemo) {
        persistDemo({ onboarding: draft })
        return draft
      }
      if (!runtimeConfig.services.robots) {
        throw new Error('Authoritative robot service is unavailable.')
      }
      const result = await browserRobotClient.saveOnboarding(draft)
      setState((current) => ({ ...current, onboarding: result.draft }))
      return result.draft
    },
    async completeOnboarding(input) {
      if (!auth.session?.userId) throw new Error('Authentication is required.')
      const idempotencyKey = `onboarding:${auth.session.userId}:v1`
      if (runtimeConfig.isDemo) {
        const now = new Date().toISOString()
        const existing = readDemoState()
        if (existing.robot && existing.configuration) {
          return {
            status: 'already-completed',
            robot: existing.robot,
            configuration: existing.configuration,
          }
        }
        const demoRobot = {
          id: `demo-robot-${auth.session.userId}`,
          ownerUserId: auth.session.userId,
          name: input.name.trim(),
          lifecycle: 'active',
          packageSlug: input.requestedPackageSlug,
          requestedPackageSlug: input.requestedPackageSlug,
          publicVerificationId: `demo-${auth.session.userId}`,
          activationDate: now,
          createdAt: now,
          updatedAt: now,
        }
        const demoConfiguration = {
          robotId: demoRobot.id,
          version: 1,
          palette: input.palette,
          parts: input.parts,
          personality: input.personality,
          tuning: input.tuning,
          voiceProfileId: input.voiceProfileId,
          updatedAt: now,
        }
        persistDemo({
          robot: demoRobot,
          configuration: demoConfiguration,
          onboarding: null,
        })
        return {
          status: 'completed',
          robot: demoRobot,
          configuration: demoConfiguration,
        }
      }
      if (!runtimeConfig.services.robots) {
        throw new Error('Authoritative robot service is unavailable.')
      }
      const result = await browserRobotClient.completeOnboarding(input, idempotencyKey)
      if (result.status === 'completed' || result.status === 'already-completed') {
        setState({
          robot: result.robot,
          configuration: result.configuration,
          onboarding: null,
        })
      }
      return result
    },
    async saveRobotConfiguration(input) {
      if (!auth.session?.userId || !robot || !configuration) {
        throw new Error('Robot state is unavailable.')
      }
      const previous = configuration
      const optimistic = {
        ...configuration,
        ...input,
        updatedAt: new Date().toISOString(),
      }
      setState((current) => ({ ...current, configuration: optimistic }))

      if (runtimeConfig.isDemo) {
        const saved = { ...optimistic, version: configuration.version + 1 }
        persistDemo({ configuration: saved })
        return { status: 'saved', configuration: saved }
      }

      if (!runtimeConfig.services.robots) {
        setState((current) => ({ ...current, configuration: previous }))
        throw new Error('Authoritative robot service is unavailable.')
      }

      try {
        const result = await browserRobotClient.saveConfiguration(robot.id, input, configuration.version)
        if (result.status === 'saved') {
          setState((current) => ({ ...current, configuration: result.configuration }))
        } else if (result.status === 'conflict') {
          setState((current) => ({ ...current, configuration: result.current }))
        } else {
          setState((current) => ({ ...current, configuration: previous }))
        }
        return result
      } catch (reason) {
        setState((current) => ({ ...current, configuration: previous }))
        throw reason
      }
    },
    async loadPassport() {
      if (!robot) return null
      if (runtimeConfig.isDemo) return buildDemoPassport(robot, configuration)
      if (!runtimeConfig.services.robots) {
        throw new Error('Authoritative robot service is unavailable.')
      }
      const result = await browserRobotClient.passport(robot.id)
      return result.passport
    },
    async exportPassportPdf() {
      if (!robot) return null
      if (runtimeConfig.isDemo) return null
      if (!runtimeConfig.services.robots) {
        throw new Error('Authoritative robot service is unavailable.')
      }
      return browserRobotClient.passportPdf(robot.id)
    },
  }

  return <RobotContext.Provider value={api}>{children}</RobotContext.Provider>
}

export function useRobot() {
  const value = useContext(RobotContext)
  if (!value) throw new Error('useRobot must be used inside RobotProvider')
  return value
}
