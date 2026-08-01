/**
 * Tiered robot portraits — one distinct face per package class.
 * Drawn inline (no external images) so every tier reads as a visible upgrade:
 * matte polymer → brushed steel → chrome + optics → armoured plating → crowned.
 */

const TIERS = {
  starter: {
    label: 'Explorer',
    shell: ['#4a5570', '#2b3348', '#141a29'],
    eye: '#5ad4ff',
    aura: 'rgba(45,91,255,.28)',
    bg: ['#1b2440', '#0d1322'],
    ears: false,
    antenna: false,
    plates: false,
    crown: 0,
    gloss: 0.12,
  },
  builder: {
    label: 'Worker',
    shell: ['#e9edf8', '#aeb8cf', '#6b7590'],
    eye: '#7fe0ff',
    aura: 'rgba(111,0,190,.28)',
    bg: ['#241f4a', '#0f1226'],
    ears: true,
    antenna: false,
    plates: false,
    crown: 0,
    gloss: 0.3,
  },
  professional: {
    label: 'Professional',
    shell: ['#ffffff', '#dce4f8', '#8e9bbd'],
    eye: '#00dbe7',
    aura: 'rgba(0,219,231,.32)',
    bg: ['#0e2b3d', '#0a1526'],
    ears: true,
    antenna: true,
    plates: false,
    crown: 0,
    gloss: 0.42,
    visorRing: true,
  },
  enterprise: {
    label: 'Enterprise',
    shell: ['#f4f7ff', '#c2cbe4', '#5f6a89'],
    eye: '#b8c3ff',
    aura: 'rgba(45,91,255,.3)',
    bg: ['#1a2148', '#0c1024'],
    ears: true,
    antenna: true,
    plates: true,
    crown: 0,
    gloss: 0.36,
    visorRing: true,
  },
  elite: {
    label: 'Elite',
    shell: ['#4b5163', '#2c3243', '#151a26'],
    eye: '#00dbe7',
    aura: 'rgba(247,201,72,.3)',
    bg: ['#3a2c12', '#150f06'],
    ears: true,
    antenna: false,
    plates: true,
    crown: 1,
    gold: true,
    gloss: 0.22,
    visorRing: true,
  },
  visionary: {
    label: 'Visionary',
    shell: ['#565b6d', '#31374a', '#171c29'],
    eye: '#74f5ff',
    aura: 'rgba(247,201,72,.42)',
    bg: ['#4a3712', '#191104'],
    ears: true,
    antenna: true,
    plates: true,
    crown: 2,
    gold: true,
    mantle: true,
    gloss: 0.28,
    visorRing: true,
  },
}

const GOLD = ['#ffe9a8', '#f7c948', '#b8860b']

export default function RobotFace({ tier = 'professional', size = 64, className = '', framed = true, animate = false }) {
  const t = TIERS[tier] || TIERS.professional
  const uid = `rf-${tier}-${size}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`${className} ${animate ? 'animate-float' : ''}`}
      role="img"
      aria-label={`${t.label} class robot`}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={t.bg[0]} />
          <stop offset="100%" stopColor={t.bg[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-shell`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={t.shell[0]} />
          <stop offset="52%" stopColor={t.shell[1]} />
          <stop offset="100%" stopColor={t.shell[2]} />
        </linearGradient>
        <linearGradient id={`${uid}-visor`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#131a2c" />
          <stop offset="100%" stopColor="#04070f" />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD[0]} />
          <stop offset="55%" stopColor={GOLD[1]} />
          <stop offset="100%" stopColor={GOLD[2]} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" stopColor={t.eye} stopOpacity="0.85" />
          <stop offset="100%" stopColor={t.eye} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-aura`}>
          <stop offset="0%" stopColor={t.aura} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <rect x="0" y="0" width="120" height="120" rx={framed ? 26 : 60} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-clip)`}>
        {/* backdrop */}
        {framed && <rect x="0" y="0" width="120" height="120" fill={`url(#${uid}-bg)`} />}
        <circle cx="60" cy="58" r="52" fill={`url(#${uid}-aura)`} />

        {/* ---------------------------------------------------------- mantle */}
        {t.mantle && (
          <path d="M14 120c2-22 20-34 46-34s44 12 46 34z" fill={`url(#${uid}-gold)`} opacity="0.85" />
        )}

        {/* shoulders */}
        <path
          d={t.mantle ? 'M22 120c2-17 17-27 38-27s36 10 38 27z' : 'M18 120c2-20 19-31 42-31s40 11 42 31z'}
          fill={`url(#${uid}-shell)`}
        />

        {/* chest core */}
        <circle cx="60" cy="112" r="9" fill="#0a0f1c" />
        <circle cx="60" cy="112" r="4.5" fill={t.eye} opacity="0.9">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* -------------------------------------------------------- plating */}
        {t.plates && (
          <>
            <path d="M20 120c1-13 9-22 22-25l4 25z" fill={t.gold ? `url(#${uid}-gold)` : t.shell[2]} opacity="0.9" />
            <path d="M100 120c-1-13-9-22-22-25l-4 25z" fill={t.gold ? `url(#${uid}-gold)` : t.shell[2]} opacity="0.9" />
          </>
        )}

        {/* ---------------------------------------------------------- antenna */}
        {t.antenna && (
          <>
            <rect x="58" y="8" width="4" height="11" rx="2" fill={t.gold ? GOLD[1] : t.shell[2]} />
            <circle cx="60" cy="7" r="4" fill={t.eye}>
              <animate attributeName="opacity" values="1;.3;1" dur="2.2s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* ------------------------------------------------------------ ears */}
        {t.ears && (
          <>
            <rect x="17" y="52" width="9" height="22" rx="4.5" fill={t.gold ? `url(#${uid}-gold)` : t.shell[2]} />
            <rect x="94" y="52" width="9" height="22" rx="4.5" fill={t.gold ? `url(#${uid}-gold)` : t.shell[2]} />
          </>
        )}

        {/* ------------------------------------------------------------ head */}
        <rect x="24" y="22" width="72" height="72" rx="26" fill={`url(#${uid}-shell)`} />
        {/* gloss */}
        <path
          d="M32 40c4-11 14-18 28-18 6 0 11 1 15 3-16 1-30 8-38 22-3 5-5 10-5 15-2-8-2-15 0-22z"
          fill="#ffffff"
          opacity={t.gloss}
        />

        {/* gold browline for crowned tiers */}
        {t.gold && <rect x="30" y="28" width="60" height="5" rx="2.5" fill={`url(#${uid}-gold)`} />}

        {/* ----------------------------------------------------------- visor */}
        <rect x="32" y="36" width="56" height="40" rx="18" fill={`url(#${uid}-visor)`} />
        {t.visorRing && (
          <rect x="32" y="36" width="56" height="40" rx="18" fill="none" stroke={t.eye} strokeOpacity="0.28" />
        )}

        {/* ------------------------------------------------------------ eyes */}
        <circle cx="47" cy="55" r="15" fill={`url(#${uid}-glow)`} />
        <circle cx="73" cy="55" r="15" fill={`url(#${uid}-glow)`} />
        <ellipse cx="47" cy="55" rx="7.5" ry="8.5" fill={t.eye} />
        <ellipse cx="73" cy="55" rx="7.5" ry="8.5" fill={t.eye} />
        <ellipse cx="44.5" cy="51.5" rx="2.6" ry="3" fill="#fff" opacity="0.9" />
        <ellipse cx="70.5" cy="51.5" rx="2.6" ry="3" fill="#fff" opacity="0.9" />

        {/* ---------------------------------------------------------- grille */}
        <rect x="50" y="82" width="20" height="3.4" rx="1.7" fill={t.eye} opacity="0.5" />
        <rect x="54" y="88" width="12" height="2.6" rx="1.3" fill={t.eye} opacity="0.28" />

        {/* ----------------------------------------------------------- crown */}
        {t.crown === 1 && (
          <g>
            <path d="M36 22l4-13 8 8 12-13 12 13 8-8 4 13z" fill={`url(#${uid}-gold)`} />
            <rect x="36" y="21" width="48" height="5" rx="2.5" fill={GOLD[1]} />
            <circle cx="60" cy="6" r="3" fill="#fff6d8" />
          </g>
        )}
        {t.crown === 2 && (
          <g>
            <path d="M30 22L35 4l10 9L60 0l15 13 10-9 5 18z" fill={`url(#${uid}-gold)`} />
            <rect x="30" y="20" width="60" height="6" rx="3" fill={GOLD[1]} />
            <circle cx="60" cy="2.5" r="3.4" fill="#fff6d8" />
            <circle cx="35" cy="6" r="2.4" fill="#ffe9a8" />
            <circle cx="85" cy="6" r="2.4" fill="#ffe9a8" />
            <circle cx="47" cy="23" r="2" fill={t.eye} />
            <circle cx="73" cy="23" r="2" fill={t.eye} />
          </g>
        )}
      </g>

      {framed && (
        <rect x="0.5" y="0.5" width="119" height="119" rx="25.5" fill="none" stroke="rgba(255,255,255,.12)" />
      )}
    </svg>
  )
}

export const tierEye = (tier) => (TIERS[tier] || TIERS.professional).eye
