import type { DeploymentState } from './types'

const transitions: Record<DeploymentState, readonly DeploymentState[]> = {
  scheduled: ['active', 'cancelled', 'failed'],
  active: ['paused', 'completed', 'failed'],
  paused: ['active', 'cancelled', 'failed'],
  completed: [],
  cancelled: [],
  failed: [],
}

export function canTransitionDeployment(from: DeploymentState, to: DeploymentState): boolean {
  return transitions[from].includes(to)
}

export function assertDeploymentTransition(from: DeploymentState, to: DeploymentState): void {
  if (!canTransitionDeployment(from, to)) throw new Error(`Invalid deployment transition: ${from} -> ${to}`)
}

export function terminalDeploymentState(state: DeploymentState): boolean {
  return transitions[state].length === 0
}
