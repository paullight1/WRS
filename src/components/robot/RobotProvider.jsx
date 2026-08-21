import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
    head: 'visor-v2',
    torso: 'core-shell',
    leftArm: 'utility-arm',
    rightArm: 'utility-arm',
    legs: 'mobility-base',
  },
  personality: 'Logical',
  tuning: { speed: 70, battery: 75, sensor: 68 },
  voiceProfileId: 'custom-en-yo',
}

function readDemoState() {
  if (typeof window === 'undefined') return { robot: null, configuration: null, onboarding: defaultDemoDraft }
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

function persistDemoState(next) {
  if (typeof window !== 'undefined') window.localStorage.setItem(DEMO_KEY, JSON.stringify(next))
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
  const initialDemo = useMemo(() => (runtimeConfig.isDemo ? readDemoState() : null), [])
  const [robot, setRobot] = useState(() => initialDemo?.robot || null)
  const [configuration, setConfiguration] = useState(() => initialDemo?.configuration || null)
  const [onboarding, setOnboarding] = useState(() => initialDemo?.onboarding || null)
  const [loading, setLoading] = useState(() => !runtimeConfig.isDemo)
  const [error, setError] = useState('')

  const persistDemo = useCallback((patch) => {
    const current = readDemoState()
    const next = { ...current, ...patch }
    persistDemoState(next)
    if ('robot' in patch) setRobot(patch.robot)
    if ('configuration' in patch) setConfiguration(patch.configuration)
    if ('onboarding' in patch) setOnboarding(patch.onboarding)
    return next
  }, [])

  const refresh = useCallback(async () => {
    if (!auth.session?.userId) {
      setRobot(null)
      setConfiguration(null)
      setOnboarding(null)
      setLoading(false)
      return null
    }
    if (runtimeConfig.isDemo) {
      const demo = readDemoState()
      setRobot(demo.robot)
      setConfiguration(demo.configuration)
      setOnboarding(demo.onboarding)
      setError('')
      setLoading(false)
      return demo
    }
    if (!runtimeConfig.services.robots) {
      setRobot(null)
      setConfiguration(null)
      setError('Authoritative robot service is unavailable.')
      setLoading(false)
      return null
    }
    try {
      const [active, draft] = await Promise.all([browserRobotClient.active(), browserRobotClient.onboarding()])
      setRobot(active.robot)
      setConfiguration(active.configuration)
      setOnboarding(draft.draft)
      setError('')
      return { ...active, onboarding: draft.draft }
    } catch (err) {
      setRobot(null)
      setConfiguration(null)
      setError(err instanceof Error ? err.message : 'Unable to load robot state.')
      return null
    } finally {
      setLoading(false)
    }
  }, [auth.session?.userId])

  useEffect(() => {
    if (!runtimeConfig.isDemo) void refresh()
  }, [refresh])

  const api = useMemo(
    () => ({
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
        if (!runtimeConfig.services.robots) throw new Error('Authoritative robot service is unavailable.')
        const result = await browserRobotClient.saveOnboarding(draft)
        setOnboarding(result.draft)
        return result.draft
      },
      async completeOnboarding(input) {
        if (!auth.session?.userId) throw new Error('Authentication is required.')
        const idempotencyKey = `onboarding:${auth.session.userId}:v1`
        if (runtimeConfig.isDemo) {
          const now = new Date().toISOString()
          const existing = readDemoState()
          if (existing.robot && existing.configuration) {
            return { status: 'already-completed', robot: existing.robot, configuration: existing.configuration }
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
          persistDemo({ robot: demoRobot, configuration: demoConfiguration, onboarding: null })
          return { status: 'completed', robot: demoRobot, configuration: demoConfiguration }
        }
        if (!runtimeConfig.services.robots) throw new Error('Authoritative robot service is unavailable.')
        const result = await browserRobotClient.completeOnboarding(input, idempotencyKey)
        if (result.status === 'completed' || result.status === 'already-completed') {
          setRobot(result.robot)
          setConfiguration(result.configuration)
          setOnboarding(null)
        }
        return result
      },
      async saveRobotConfiguration(input) {
        if (!auth.session?.userId || !robot || !configuration) throw new Error('Robot state is unavailable.')
        const previous = configuration
        const optimistic = {
          ...configuration,
          ...input,
          updatedAt: new Date().toISOString(),
        }
        setConfiguration(optimistic)
        if (runtimeConfig.isDemo) {
          const saved = { ...optimistic, version: configuration.version + 1 }
          persistDemo({ configuration: saved })
          return { status: 'saved', configuration: saved }
        }
        if (!runtimeConfig.services.robots) {
          setConfiguration(previous)
          throw new Error('Authoritative robot service is unavailable.')
        }
        try {
          const result = await browserRobotClient.saveConfiguration(robot.id, input, configuration.version)
          if (result.status === 'saved') setConfiguration(result.configuration)
          else if (result.status === 'conflict') setConfiguration(result.current)
          else setConfiguration(previous)
          return result
        } catch (err) {
          setConfiguration(previous)
          throw err
        }
      },
      async loadPassport() {
        if (!robot) return null
        if (runtimeConfig.isDemo) return buildDemoPassport(robot, configuration)
        if (!runtimeConfig.services.robots) throw new Error('Authoritative robot service is unavailable.')
        const result = await browserRobotClient.passport(robot.id)
        return result.passport
      },
      async exportPassportPdf() {
        if (!robot) return null
        if (runtimeConfig.isDemo) return null
        if (!runtimeConfig.services.robots) throw new Error('Authoritative robot service is unavailable.')
        return browserRobotClient.passportPdf(robot.id)
      },
    }),
    [auth.session?.userId, configuration, error, loading, onboarding, persistDemo, refresh, robot],
  )

  return <RobotContext.Provider value={api}>{children}</RobotContext.Provider>
}

export function useRobot() {
  const value = useContext(RobotContext)
  if (!value) throw new Error('useRobot must be used inside RobotProvider')
  return value
}
