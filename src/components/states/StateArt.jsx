/**
 * State illustrations.
 *
 * Bold and filled, deliberately unlike the landing page's hairline card art —
 * this is the app, and a state screen has to read at a glance on a phone held
 * at arm's length. Each drawing is two brand colours on a soft halo, sized by
 * one `size` prop, with no external assets.
 *
 * Motion is opt-in per drawing and always wrapped in `motion-safe:` so
 * `prefers-reduced-motion` leaves a still, complete image.
 */

const C = {
  blue: '#2d5bff',
  ink: '#b8c3ff',
  cyan: '#00dbe7',
  violet: '#8b2fd6',
  lilac: '#ddb7ff',
  green: '#3ddc97',
  amber: '#f7c948',
  red: '#ffb4ab',
  slate: '#434656',
  dim: '#8e90a2',
}

/** Soft radial halo every drawing sits on, so it never floats on flat black. */
function Halo({ color, id }) {
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="70%" stopColor={color} stopOpacity="0.05" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="80" r="78" fill={`url(#${id})`} />
    </>
  )
}

/* --------------------------------------------------------------- drawings */

const empty = () => (
  <>
    <Halo color={C.blue} id="ha-empty" />
    {/* floating pieces that have not landed yet */}
    <g className="motion-safe:animate-float" style={{ animationDuration: '5s' }}>
      <rect x="52" y="24" width="20" height="20" rx="6" fill={C.ink} opacity="0.35" />
      <rect x="92" y="34" width="14" height="14" rx="5" fill={C.cyan} opacity="0.4" />
    </g>
    {/* open tray */}
    <path d="M34 76h30l8 12h16l8-12h30v40a12 12 0 0 1-12 12H46a12 12 0 0 1-12-12z" fill={C.slate} />
    <path d="M34 76l14-26a10 10 0 0 1 9-6h46a10 10 0 0 1 9 6l14 26" fill="none" stroke={C.dim} strokeWidth="5" strokeLinejoin="round" />
    <rect x="34" y="112" width="92" height="16" rx="8" fill={C.blue} opacity="0.35" />
  </>
)

const caughtUp = () => (
  <>
    <Halo color={C.green} id="ha-caught" />
    <g className="motion-safe:animate-breathe" style={{ animationDuration: '3.4s' }}>
      <circle cx="80" cy="80" r="52" fill={C.green} opacity="0.12" />
    </g>
    <circle cx="80" cy="80" r="38" fill={C.green} opacity="0.22" />
    <circle cx="80" cy="80" r="30" fill={C.green} />
    <path d="M66 80l10 10 20-21" fill="none" stroke="#0b2b1e" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    {[
      [26, 44],
      [132, 52],
      [36, 116],
      [126, 112],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={i % 2 ? 4 : 6} fill={C.green} opacity="0.5" />
    ))}
  </>
)

const noResults = () => (
  <>
    <Halo color={C.cyan} id="ha-search" />
    {/* the grid being searched */}
    {Array.from({ length: 9 }).map((_, i) => (
      <rect
        key={i}
        x={34 + (i % 3) * 32}
        y={34 + Math.floor(i / 3) * 32}
        width="22"
        height="22"
        rx="7"
        fill={C.slate}
        opacity={0.85}
      />
    ))}
    <g className="motion-safe:animate-float" style={{ animationDuration: '4.5s' }}>
      <circle cx="88" cy="80" r="30" fill="#111417" fillOpacity="0.7" stroke={C.cyan} strokeWidth="7" />
      <path d="M110 102l18 18" stroke={C.cyan} strokeWidth="10" strokeLinecap="round" />
    </g>
  </>
)

const error = () => (
  <>
    <Halo color={C.red} id="ha-error" />
    <g className="motion-safe:animate-breathe" style={{ animationDuration: '2.6s' }}>
      <circle cx="80" cy="80" r="50" fill={C.red} opacity="0.1" />
    </g>
    <path d="M80 28l52 90a10 10 0 0 1-9 15H37a10 10 0 0 1-9-15z" fill={C.red} opacity="0.22" />
    <path d="M80 40l44 76a6 6 0 0 1-5 9H41a6 6 0 0 1-5-9z" fill={C.red} />
    <rect x="74" y="66" width="12" height="34" rx="6" fill="#3b0906" />
    <circle cx="80" cy="110" r="7" fill="#3b0906" />
  </>
)

const offline = () => (
  <>
    <Halo color={C.amber} id="ha-offline" />
    <path d="M44 96a24 24 0 0 1 4-47 32 32 0 0 1 60-6 22 22 0 0 1 6 43z" fill={C.slate} />
    <path d="M44 96a24 24 0 0 1 4-47 32 32 0 0 1 60-6 22 22 0 0 1 6 43z" fill="none" stroke={C.dim} strokeWidth="4" />
    {[
      [56, 116],
      [80, 124],
      [104, 116],
    ].map(([x, y], i) => (
      <rect
        key={i}
        x={x - 4}
        y={y}
        width="8"
        height="20"
        rx="4"
        fill={C.amber}
        opacity={0.55}
        className="motion-safe:animate-breathe"
        style={{ animationDuration: '2s', animationDelay: `${i * 220}ms` }}
      />
    ))}
    <path d="M40 40l82 82" stroke={C.amber} strokeWidth="10" strokeLinecap="round" />
  </>
)

const locked = () => (
  <>
    <Halo color={C.amber} id="ha-locked" />
    <path d="M56 74V58a24 24 0 0 1 48 0v16" fill="none" stroke={C.dim} strokeWidth="10" strokeLinecap="round" />
    <rect x="40" y="74" width="80" height="60" rx="16" fill={C.amber} opacity="0.22" />
    <rect x="46" y="80" width="68" height="48" rx="12" fill={C.amber} />
    <circle cx="80" cy="98" r="8" fill="#3a2a00" />
    <rect x="76" y="102" width="8" height="14" rx="4" fill="#3a2a00" />
    <g className="motion-safe:animate-float" style={{ animationDuration: '4s' }}>
      <circle cx="126" cy="46" r="5" fill={C.amber} opacity="0.6" />
      <circle cx="34" cy="52" r="4" fill={C.amber} opacity="0.45" />
    </g>
  </>
)

const loading = () => (
  <>
    <Halo color={C.blue} id="ha-loading" />
    <circle cx="80" cy="80" r="44" fill="none" stroke={C.slate} strokeWidth="10" />
    <g className="motion-safe:animate-spin" style={{ transformOrigin: '80px 80px', animationDuration: '1.6s' }}>
      <path d="M80 36a44 44 0 0 1 44 44" fill="none" stroke={C.blue} strokeWidth="10" strokeLinecap="round" />
      <circle cx="124" cy="80" r="8" fill={C.cyan} />
    </g>
    <circle cx="80" cy="80" r="14" fill={C.ink} opacity="0.35" />
  </>
)

const success = () => (
  <>
    <Halo color={C.cyan} id="ha-success" />
    {/* burst */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
      <rect
        key={deg}
        x="77"
        y="12"
        width="6"
        height="18"
        rx="3"
        fill={i % 2 ? C.cyan : C.lilac}
        opacity="0.7"
        transform={`rotate(${deg} 80 80)`}
        className="motion-safe:animate-breathe"
        style={{ animationDuration: '2.4s', animationDelay: `${i * 90}ms` }}
      />
    ))}
    <circle cx="80" cy="80" r="40" fill={C.cyan} opacity="0.2" />
    <circle cx="80" cy="80" r="31" fill={C.cyan} />
    <path d="M65 80l11 11 20-22" fill="none" stroke="#00272a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </>
)

const welcome = () => (
  <>
    <Halo color={C.violet} id="ha-welcome" />
    <g className="motion-safe:animate-float" style={{ animationDuration: '5.5s' }}>
      {/* antenna */}
      <path d="M80 26v12" stroke={C.lilac} strokeWidth="5" strokeLinecap="round" />
      <circle cx="80" cy="22" r="6" fill={C.cyan} />
      {/* head */}
      <rect x="38" y="38" width="84" height="64" rx="22" fill={C.slate} />
      <rect x="38" y="38" width="84" height="64" rx="22" fill="none" stroke={C.lilac} strokeWidth="4" opacity="0.5" />
      <rect x="52" y="56" width="56" height="28" rx="14" fill="#0c0e12" />
      <circle cx="68" cy="70" r="7" fill={C.cyan} />
      <circle cx="92" cy="70" r="7" fill={C.cyan} />
      {/* shoulders */}
      <path d="M50 134v-8a30 30 0 0 1 60 0v8z" fill={C.violet} opacity="0.55" />
    </g>
    {[
      [26, 60, 5],
      [136, 74, 6],
      [124, 36, 4],
      [34, 106, 4],
    ].map(([x, y, r], i) => (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={r}
        fill={i % 2 ? C.cyan : C.lilac}
        className="motion-safe:animate-breathe"
        style={{ animationDuration: '3s', animationDelay: `${i * 300}ms` }}
      />
    ))}
  </>
)

const ART = { empty, caughtUp, noResults, error, offline, locked, loading, success, welcome }

export const STATE_KINDS = Object.keys(ART)

/**
 * @param kind  one of STATE_KINDS
 * @param size  square px
 */
export default function StateArt({ kind = 'empty', size = 132, className = '' }) {
  const draw = ART[kind] || ART.empty
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role="presentation"
      aria-hidden="true"
      className={className}
    >
      {draw()}
    </svg>
  )
}
