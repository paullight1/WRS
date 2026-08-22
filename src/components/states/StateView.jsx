import StateArt from './StateArt.jsx'

/**
 * The whole-region state block: illustration, one line of what happened, one
 * line of what to do, then the action.
 *
 * Replaces the icon-in-a-box EmptyState. Same contract as before plus `kind`,
 * so screens read the same at the call site.
 *
 * `live` announces the state to screen readers when it appears as the result
 * of something the user did (changing a filter, a request failing) — silence
 * after an action is the part of an empty state people miss.
 */
export default function StateView({ kind = 'empty', title, desc, action, live = false, size = 132, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center px-6 py-12 text-center ${className}`}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
    >
      <StateArt kind={kind} size={size} />
      <p className="mt-4 font-headline-md text-headline-md text-on-surface">{title}</p>
      {desc && <p className="mt-2 max-w-[36ch] text-body-md text-on-surface-variant">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/**
 * The loading twin. Kept separate so a screen can never accidentally render a
 * spinner with an empty-state headline, and so it can carry `aria-busy`.
 */
export function LoadingView({ title = 'Loading', desc, className = '' }) {
  return (
    <div className={`flex flex-col items-center px-6 py-12 text-center ${className}`} role="status" aria-busy="true">
      <StateArt kind="loading" size={112} />
      <p className="mt-4 font-headline-md text-headline-md text-on-surface">{title}</p>
      {desc && <p className="mt-2 max-w-[36ch] text-body-md text-on-surface-variant">{desc}</p>}
    </div>
  )
}
