import { describe, expect, it } from 'vitest'
import { evaluateDeploymentEligibility } from '../../src/domain/deployment/eligibility'
import {
  assertDeploymentTransition,
  canTransitionDeployment,
  terminalDeploymentState,
} from '../../src/domain/deployment/stateMachine'

const requirement = {
  minPackageSlug: 'professional',
  requiredSkills: ['warehouse.pick'],
  requiredCertifications: ['safety-basic'],
  minQualityScore: 80,
  requireKyc: true,
  regulated: false,
  allowedCountries: ['NG'],
}

const eligibleEvidence = {
  packageSlug: 'professional',
  robotLifecycle: 'active',
  kycStatus: 'verified',
  qualityScore: 92,
  available: true,
  countryCode: 'NG',
  verifiedSkills: ['warehouse.pick'],
  activeCertifications: ['safety-basic'],
}

describe('Plan 7 deployment domain', () => {
  it('accepts only complete authoritative eligibility evidence', () => {
    expect(evaluateDeploymentEligibility(eligibleEvidence, requirement)).toEqual({ eligible: true, reasons: [] })
  })

  it('reports independent eligibility failures without hiding other blockers', () => {
    const decision = evaluateDeploymentEligibility(
      {
        ...eligibleEvidence,
        packageSlug: 'builder',
        robotLifecycle: 'suspended',
        kycStatus: 'pending',
        qualityScore: 50,
        available: false,
        countryCode: 'GH',
        verifiedSkills: [],
        activeCertifications: [],
      },
      requirement,
    )

    expect(decision.eligible).toBe(false)
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        'robot-lifecycle',
        'availability',
        'package',
        'kyc',
        'quality',
        'location',
        'skill:warehouse.pick',
        'certification:safety-basic',
      ]),
    )
  })

  it('requires enterprise-or-higher capability for regulated opportunities', () => {
    const regulated = { ...requirement, regulated: true }
    expect(evaluateDeploymentEligibility(eligibleEvidence, regulated).reasons).toContain('regulated-capability')
    expect(evaluateDeploymentEligibility({ ...eligibleEvidence, packageSlug: 'enterprise' }, regulated)).toEqual({
      eligible: true,
      reasons: [],
    })
  })

  it('allows only declared deployment transitions and closes terminal states', () => {
    expect(canTransitionDeployment('scheduled', 'active')).toBe(true)
    expect(canTransitionDeployment('active', 'paused')).toBe(true)
    expect(canTransitionDeployment('paused', 'active')).toBe(true)
    expect(canTransitionDeployment('completed', 'active')).toBe(false)
    expect(terminalDeploymentState('completed')).toBe(true)
    expect(terminalDeploymentState('cancelled')).toBe(true)
    expect(terminalDeploymentState('failed')).toBe(true)
    expect(() => assertDeploymentTransition('completed', 'active')).toThrow(/invalid deployment transition/i)
  })
})
