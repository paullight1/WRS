/**
 * Vector robot bust used everywhere a robot render would sit.
 * Drawn inline so the prototype has zero external image dependencies.
 */
export default function RobotAvatar({ size = 120, className = '', glow = true, eye = '#00dbe7' }) {
  const uid = `r${size}${eye.replace('#', '')}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 22px rgba(0,219,231,.35))' } : undefined}
      role="img"
      aria-label="WRS robot"
    >
      <defs>
        <linearGradient id={`${uid}-shell`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f6ff" />
          <stop offset="55%" stopColor="#d3d9ec" />
          <stop offset="100%" stopColor="#8d97b5" />
        </linearGradient>
        <linearGradient id={`${uid}-visor`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10192e" />
          <stop offset="100%" stopColor="#050a16" />
        </linearGradient>
        <linearGradient id={`${uid}-torso`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9d1e8" />
          <stop offset="100%" stopColor="#6c7797" />
        </linearGradient>
        <radialGradient id={`${uid}-eyeglow`}>
          <stop offset="0%" stopColor={eye} stopOpacity="0.9" />
          <stop offset="100%" stopColor={eye} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* aura */}
      <circle cx="100" cy="96" r="74" fill={eye} opacity="0.07" />

      {/* antenna */}
      <rect x="97" y="16" width="6" height="16" rx="3" fill="#8d97b5" />
      <circle cx="100" cy="14" r="6" fill={eye}>
        <animate attributeName="opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* shoulders / torso */}
      <path d="M46 200c0-28 20-46 54-46s54 18 54 46z" fill={`url(#${uid}-torso)`} />
      <rect x="86" y="140" width="28" height="18" rx="8" fill="#9aa4c1" />
      <circle cx="100" cy="176" r="10" fill="#0d1220" />
      <circle cx="100" cy="176" r="5" fill={eye} opacity="0.9">
        <animate attributeName="r" values="4;6;4" dur="2.8s" repeatCount="indefinite" />
      </circle>

      {/* ears */}
      <rect x="30" y="76" width="14" height="34" rx="7" fill="#9aa4c1" />
      <rect x="156" y="76" width="14" height="34" rx="7" fill="#9aa4c1" />

      {/* head */}
      <rect x="42" y="34" width="116" height="112" rx="40" fill={`url(#${uid}-shell)`} />
      <rect x="52" y="44" width="96" height="80" rx="32" fill={`url(#${uid}-visor)`} />

      {/* eyes */}
      <circle cx="78" cy="84" r="22" fill={`url(#${uid}-eyeglow)`} />
      <circle cx="122" cy="84" r="22" fill={`url(#${uid}-eyeglow)`} />
      <ellipse cx="78" cy="84" rx="11" ry="12" fill={eye} />
      <ellipse cx="122" cy="84" rx="11" ry="12" fill={eye} />
      <ellipse cx="74" cy="79" rx="4" ry="4.5" fill="#ffffff" opacity=".85" />
      <ellipse cx="118" cy="79" rx="4" ry="4.5" fill="#ffffff" opacity=".85" />

      {/* mouth grille */}
      <rect x="86" y="106" width="28" height="4" rx="2" fill={eye} opacity=".55" />
      <rect x="92" y="114" width="16" height="3" rx="1.5" fill={eye} opacity=".3" />

      {/* scanline */}
      <rect x="52" y="44" width="96" height="80" rx="32" fill="none" stroke={eye} strokeOpacity=".18" />
    </svg>
  )
}

export function RobotBadge({ size = 44, className = '' }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-primary-container/25 ${className}`}
      style={{ width: size, height: size }}
    >
      <RobotAvatar size={size * 0.92} glow={false} />
    </span>
  )
}
