import type { PackageSlug } from './types'

export interface PackageDefinition {
  slug: PackageSlug
  name: string
  robotClass: string
  priceUsd: number
  rank: number
  capabilities: readonly string[]
}

export const PACKAGE_DEFINITIONS: Record<PackageSlug, PackageDefinition> = {
  starter: {
    slug: 'starter',
    name: 'Starter',
    robotClass: 'Explorer Robot',
    priceUsd: 20,
    rank: 1,
    capabilities: ['robot.core', 'training.basic', 'data.basic'],
  },
  builder: {
    slug: 'builder',
    name: 'Builder',
    robotClass: 'Worker Robot',
    priceUsd: 50,
    rank: 2,
    capabilities: ['robot.core', 'training.basic', 'data.basic', 'marketplace.basic'],
  },
  professional: {
    slug: 'professional',
    name: 'Professional',
    robotClass: 'Professional Robot',
    priceUsd: 100,
    rank: 3,
    capabilities: [
      'robot.core',
      'training.basic',
      'data.basic',
      'marketplace.basic',
      'deployment.standard',
      'voice.custom',
      'tuning.advanced',
    ],
  },
  enterprise: {
    slug: 'enterprise',
    name: 'Enterprise',
    robotClass: 'Enterprise Robot',
    priceUsd: 200,
    rank: 4,
    capabilities: [
      'robot.core',
      'training.basic',
      'data.basic',
      'marketplace.basic',
      'deployment.standard',
      'deployment.regulated',
      'voice.custom',
      'tuning.advanced',
      'analytics.advanced',
    ],
  },
  elite: {
    slug: 'elite',
    name: 'Elite',
    robotClass: 'Elite Robot',
    priceUsd: 500,
    rank: 5,
    capabilities: [
      'robot.core',
      'training.basic',
      'data.basic',
      'marketplace.basic',
      'deployment.standard',
      'deployment.regulated',
      'voice.custom',
      'tuning.advanced',
      'analytics.advanced',
      'robot.elite-modules',
    ],
  },
  visionary: {
    slug: 'visionary',
    name: 'Visionary',
    robotClass: 'Visionary Robot',
    priceUsd: 1000,
    rank: 6,
    capabilities: [
      'robot.core',
      'training.basic',
      'data.basic',
      'marketplace.basic',
      'deployment.standard',
      'deployment.regulated',
      'voice.custom',
      'tuning.advanced',
      'analytics.advanced',
      'robot.elite-modules',
      'robot.visionary-modules',
    ],
  },
}

export function isPackageSlug(value: string): value is PackageSlug {
  return Object.hasOwn(PACKAGE_DEFINITIONS, value)
}

export function packageDefinition(slug: PackageSlug): PackageDefinition {
  return PACKAGE_DEFINITIONS[slug]
}

export function tierAtLeast(current: PackageSlug, required: PackageSlug): boolean {
  return PACKAGE_DEFINITIONS[current].rank >= PACKAGE_DEFINITIONS[required].rank
}

export function hasCapability(packageSlug: PackageSlug, capability: string): boolean {
  return PACKAGE_DEFINITIONS[packageSlug].capabilities.includes(capability)
}
