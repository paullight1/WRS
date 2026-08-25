import type {
  DeploymentEligibilityDecision,
  DeploymentEligibilityEvidence,
  DeploymentEligibilityRequirement,
} from './types'

const packageRank: Record<string, number> = {
  starter: 1,
  builder: 2,
  professional: 3,
  enterprise: 4,
  elite: 5,
  visionary: 6,
}

export function evaluateDeploymentEligibility(
  evidence: DeploymentEligibilityEvidence,
  requirement: DeploymentEligibilityRequirement,
): DeploymentEligibilityDecision {
  const reasons: string[] = []
  if (evidence.robotLifecycle !== 'active') reasons.push('robot-lifecycle')
  if (!evidence.available) reasons.push('availability')
  if ((packageRank[evidence.packageSlug] || 0) < (packageRank[requirement.minPackageSlug] || Number.MAX_SAFE_INTEGER)) {
    reasons.push('package')
  }
  if (requirement.requireKyc && evidence.kycStatus !== 'verified') reasons.push('kyc')
  if (evidence.qualityScore < requirement.minQualityScore) reasons.push('quality')
  if (
    requirement.allowedCountries.length > 0 &&
    (!evidence.countryCode || !requirement.allowedCountries.includes(evidence.countryCode.toUpperCase()))
  ) {
    reasons.push('location')
  }
  const skills = new Set(evidence.verifiedSkills)
  for (const skill of requirement.requiredSkills) if (!skills.has(skill)) reasons.push(`skill:${skill}`)
  const certifications = new Set(evidence.activeCertifications)
  for (const certification of requirement.requiredCertifications) {
    if (!certifications.has(certification)) reasons.push(`certification:${certification}`)
  }
  if (requirement.regulated && (packageRank[evidence.packageSlug] || 0) < packageRank.enterprise) {
    reasons.push('regulated-capability')
  }
  return { eligible: reasons.length === 0, reasons: [...new Set(reasons)] }
}

export function deploymentPackageRank(slug: string): number {
  return packageRank[slug] || 0
}
