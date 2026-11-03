export default function DashboardIcon({ name, size = 22, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <use href={`/dashboard/icons.svg#${name || 'robot'}`} />
    </svg>
  )
}

export function AssetCoin({ kind = 'rbc', className = '' }) {
  return (
    <span className={`dw-coin dw-coin-${kind} ${className}`}>
      <DashboardIcon name={kind === 'rbc' ? 'robot' : kind === 'xp' ? 'star' : 'dollar'} size={25} />
    </span>
  )
}
