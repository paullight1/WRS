export type WrsMode = 'demo' | 'staging' | 'production'

export type SensitiveServiceName = 'payments' | 'identity' | 'data' | 'rewards' | 'deployments' | 'support'

export interface SensitiveActionConfig {
  mode: WrsMode
  services?: Partial<Record<SensitiveServiceName, boolean>>
}

export interface SensitiveActionDefinition {
  service: SensitiveServiceName
  risk: 'P0' | 'P1' | 'P2'
  disposition: 'disable' | 'demo-label' | 'read-only'
  implemented: boolean
}

export interface SensitiveActionPolicy {
  id: string
  enabled: boolean
  authoritative: boolean
  demo: boolean
  label: string
  reason: string
}

export const SENSITIVE_ACTIONS: Readonly<Record<string, SensitiveActionDefinition>>

export function requiredSensitiveActionIds(): readonly string[]

export function getSensitiveActionPolicy(id: string, config?: SensitiveActionConfig): SensitiveActionPolicy
