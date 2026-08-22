/**
 * Card illustrations.
 *
 * One drawing per card, all built from the same vocabulary — 1.5px strokes on a
 * faint plotting grid, one accent colour per card, no fills except the accent.
 * They read as a set rather than as twelve unrelated pictures, and they carry
 * the explanatory weight that icon tiles were carrying badly.
 *
 * Inline SVG rather than raster: no download, no pixelation, and the stroke
 * colour inherits from the card so light/dark and hover states come free.
 */

const V = '0 0 320 200'
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

/** Shared plotting grid, masked so it fades before the card edge. */
function Grid() {
  return (
    <>
      <defs>
        <linearGradient id="ca-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="ca-mask">
          <rect width="320" height="200" fill="url(#ca-fade)" />
        </mask>
      </defs>
      <g mask="url(#ca-mask)" opacity="0.5">
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="currentColor" strokeWidth="1" opacity="0.16" />
        ))}
        {[40, 80, 120, 160, 200, 240, 280].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="200" stroke="currentColor" strokeWidth="1" opacity="0.16" />
        ))}
      </g>
    </>
  )
}

/* ------------------------------------------------------------ the six steps */

const own = (a) => (
  <>
    <rect x="112" y="34" width="96" height="70" rx="20" {...S} />
    <circle cx="141" cy="69" r="7" fill={a} />
    <circle cx="179" cy="69" r="7" fill={a} />
    <path d="M160 104v14" {...S} />
    <path d="M96 170v-30a22 22 0 0 1 22-22h84a22 22 0 0 1 22 22v30" {...S} />
    <path d="M124 146h72" {...S} opacity="0.5" />
  </>
)

const train = (a) => (
  <>
    <path d="M56 170h208" {...S} opacity="0.45" />
    {[
      [76, 44],
      [112, 68],
      [148, 96],
      [184, 118],
      [220, 142],
    ].map(([x, h], i) => (
      <rect
        key={x}
        x={x}
        y={170 - h}
        width="26"
        height={h}
        rx="7"
        {...S}
        fill={i > 2 ? a : 'none'}
        stroke={i > 2 ? a : 'currentColor'}
      />
    ))}
    <path d="M76 60 220 30" {...S} opacity="0.5" strokeDasharray="4 6" />
  </>
)

const contribute = (a) => (
  <>
    {Array.from({ length: 18 }).map((_, i) => {
      const on = [2, 5, 8, 9, 13, 16].includes(i)
      return (
        <rect
          key={i}
          x={64 + (i % 6) * 34}
          y={52 + Math.floor(i / 6) * 34}
          width="24"
          height="24"
          rx="7"
          {...S}
          fill={on ? a : 'none'}
          stroke={on ? a : 'currentColor'}
          opacity={on ? 1 : 0.55}
        />
      )
    })}
    <path d="M64 168h192" {...S} opacity="0.45" />
  </>
)

/* The trajectory rises left-to-right and ends in a solid arrowhead. An open
   chevron here read as a stray mark rather than a direction. */
const deploy = (a) => (
  <>
    <path d="M50 160C104 160 122 74 194 74c30 0 50-10 64-24" {...S} />
    <circle cx="50" cy="160" r="6" {...S} />
    <circle cx="194" cy="74" r="6" fill={a} stroke={a} />
    <path d="M272 42l-20 2 8 14z" fill={a} stroke={a} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M50 178h216" {...S} opacity="0.35" strokeDasharray="3 7" />
  </>
)

const monitor = (a) => (
  <>
    <path d="M52 132l40-26 34 20 38-46 40 28 44-56" {...S} stroke={a} />
    <path d="M52 168h216" {...S} opacity="0.45" />
    <path d="M52 44v124" {...S} opacity="0.45" />
    <circle cx="248" cy="52" r="7" fill={a} />
    <circle cx="248" cy="52" r="14" {...S} stroke={a} opacity="0.4" />
  </>
)

const earn = (a) => (
  <>
    <path d="M56 62h208" {...S} stroke={a} strokeDasharray="5 7" opacity="0.8" />
    {[
      [82, 56],
      [126, 78],
      [170, 100],
      [214, 128],
    ].map(([x, h], i) => {
      const last = i === 3
      return (
        <rect
          key={x}
          x={x}
          y={168 - h}
          width="30"
          height={h}
          rx="8"
          {...S}
          fill={last ? a : 'none'}
          stroke={last ? a : 'currentColor'}
          opacity={last ? 1 : 0.4 + i * 0.15}
        />
      )
    })}
    <path d="M56 168h208" {...S} opacity="0.45" />
  </>
)

/* -------------------------------------------------------- the six data tasks */

const wave = (a, from = 60, count = 15) => (
  <>
    {Array.from({ length: count }).map((_, i) => {
      const h = [22, 46, 78, 54, 96, 62, 110, 84, 118, 72, 92, 48, 70, 36, 24][i % 15]
      const mid = i > 4 && i < 10
      return (
        <path
          key={i}
          d={`M${from + i * 14} ${100 - h / 2}v${h}`}
          {...S}
          strokeWidth="4"
          stroke={mid ? a : 'currentColor'}
          opacity={mid ? 1 : 0.55}
        />
      )
    })}
  </>
)

const voice = (a) => wave(a)

const image = (a) => (
  <>
    <rect x="70" y="42" width="180" height="116" rx="12" {...S} opacity="0.55" />
    {[
      [86, 58, -1, -1],
      [234, 58, 1, -1],
      [86, 142, -1, 1],
      [234, 142, 1, 1],
    ].map(([x, y, dx, dy], i) => (
      <path key={i} d={`M${x} ${y + 16 * dy}V${y}H${x + 16 * dx}`} {...S} stroke={a} strokeWidth="2.5" />
    ))}
    <circle cx="132" cy="112" r="20" {...S} />
    <path d="M162 134l30-38 34 38z" {...S} />
  </>
)

const video = (a) => (
  <>
    {[52, 128, 204].map((x, i) => (
      <rect key={x} x={x} y="58" width="64" height="84" rx="10" {...S} opacity={i === 1 ? 1 : 0.45} />
    ))}
    <path d="M150 82l26 18-26 18z" fill={a} stroke={a} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M52 44h216M52 156h216" {...S} opacity="0.3" strokeDasharray="3 7" />
  </>
)

const text = (a) => (
  <>
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M62 ${62 + i * 26}h84`} {...S} strokeWidth="5" opacity={0.55 - i * 0.08} />
    ))}
    {[0, 1, 2, 3].map((i) => (
      <path
        key={i}
        d={`M188 ${62 + i * 26}h${i === 3 ? 52 : 70}`}
        {...S}
        strokeWidth="5"
        stroke={a}
        opacity={1 - i * 0.15}
      />
    ))}
    <path d="M158 76l14 24-14 24" {...S} opacity="0.6" />
  </>
)

const speech = (a) => (
  <>
    {wave(a, 46, 8)}
    <path d="M164 92l16 8-16 8" {...S} opacity="0.6" />
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M196 ${68 + i * 22}h${i === 3 ? 44 : 66}`} {...S} strokeWidth="5" opacity={0.7 - i * 0.12} />
    ))}
  </>
)

const conversation = (a) => (
  <>
    <path
      d="M58 50h122a14 14 0 0 1 14 14v40a14 14 0 0 1-14 14H96l-24 20v-20h-14a14 14 0 0 1-14-14V64a14 14 0 0 1 14-14z"
      {...S}
    />
    <path
      d="M142 106h120a14 14 0 0 1 14 14v34a14 14 0 0 1-14 14h-84l-22 18v-18h-14a14 14 0 0 1-14-14v-34a14 14 0 0 1 14-14z"
      {...S}
      stroke={a}
    />
    <path d="M74 74h72M74 92h48" {...S} strokeWidth="4" opacity="0.5" />
  </>
)

const ART = {
  own,
  train,
  contribute,
  deploy,
  monitor,
  earn,
  'voice-recording': voice,
  'image-annotation': image,
  'video-annotation': video,
  'text-translation': text,
  'speech-transcription': speech,
  'conversation-review': conversation,
}

/**
 * @param name    key into ART
 * @param accent  the single highlight colour for this card
 */
export default function CardArt({ name, accent = '#b8c3ff', className = '' }) {
  const draw = ART[name]
  if (!draw) return null
  return (
    <svg
      viewBox={V}
      role="presentation"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      className={`w-full text-on-surface-variant ${className}`}
    >
      <Grid />
      {draw(accent)}
    </svg>
  )
}
