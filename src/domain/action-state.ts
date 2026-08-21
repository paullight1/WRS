export type ActionState = 'idle' | 'pending' | 'succeeded' | 'failed'

export function isTerminalActionState(state: ActionState): boolean {
  return state === 'succeeded' || state === 'failed'
}
