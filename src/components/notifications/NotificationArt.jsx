/**
 * One bold drawing per notification category.
 *
 * A notification list is scanned, not read — at a glance the drawing should
 * say which part of the product this came from before any words are parsed.
 * Filled shapes on a tinted rounded plate, 48px, same family as the toast and
 * state art.
 */

const PLATE = { rx: 16, w: 48, h: 48 }

const CATS = {
  'Robot Activity': {
    tint: '#2d5bff',
    draw: (
      <>
        <rect x="12" y="16" width="24" height="19" rx="7" fill="#b8c3ff" />
        <circle cx="19.5" cy="26" r="3.2" fill="#001355" />
        <circle cx="28.5" cy="26" r="3.2" fill="#001355" />
        <path d="M24 10v5" stroke="#b8c3ff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="9" r="2.6" fill="#00dbe7" />
      </>
    ),
  },
  'Data Task': {
    tint: '#0f8fa0',
    draw: (
      <>
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => {
            const on = (r + c) % 2 === 0
            return (
              <rect
                key={`${r}${c}`}
                x={13 + c * 8.5}
                y={13 + r * 8.5}
                width="6.5"
                height="6.5"
                rx="2"
                fill="#00dbe7"
                opacity={on ? 1 : 0.32}
              />
            )
          }),
        )}
        <path
          d="M30 32l3.5 3.5L40 29"
          fill="none"
          stroke="#00dbe7"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  Deployment: {
    tint: '#8b2fd6',
    draw: (
      <>
        <path d="M24 9c6 5 9 11 9 18l-4 6h-10l-4-6c0-7 3-13 9-18z" fill="#ddb7ff" />
        <circle cx="24" cy="21" r="4" fill="#2c0051" />
        <path d="M18 34l-4 6h8zM30 34l4 6h-8z" fill="#ddb7ff" opacity="0.7" />
      </>
    ),
  },
  Earnings: {
    tint: '#128b57',
    draw: (
      <>
        <circle cx="24" cy="24" r="14" fill="#3ddc97" />
        <path
          d="M24 15v18M20 19h6a3.5 3.5 0 0 1 0 7h-4a3.5 3.5 0 0 0 0 7h6"
          fill="none"
          stroke="#08281c"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </>
    ),
  },
  'Community Event': {
    tint: '#d81b7a',
    draw: (
      <>
        <circle cx="18" cy="20" r="6" fill="#ff9ec7" />
        <circle cx="31" cy="20" r="6" fill="#ff9ec7" opacity="0.65" />
        <path d="M8 38a10 10 0 0 1 20 0z" fill="#ff9ec7" />
        <path d="M22 38a10 10 0 0 1 18-1z" fill="#ff9ec7" opacity="0.65" />
      </>
    ),
  },
  Wallet: {
    tint: '#b07d00',
    draw: (
      <>
        <rect x="10" y="15" width="28" height="20" rx="6" fill="#f7c948" />
        <path d="M10 21h28" stroke="#3a2a00" strokeWidth="3" />
        <circle cx="31" cy="29" r="3.2" fill="#3a2a00" />
      </>
    ),
  },
}

const FALLBACK = {
  tint: '#434656',
  draw: (
    <>
      <circle cx="24" cy="24" r="13" fill="#b8c3ff" opacity="0.6" />
      <circle cx="24" cy="18" r="2.6" fill="#111417" />
      <rect x="22.2" y="22" width="3.6" height="10" rx="1.8" fill="#111417" />
    </>
  ),
}

export default function NotificationArt({ cat, muted = false }) {
  const c = CATS[cat] || FALLBACK
  return (
    <span
      className="grid shrink-0 place-items-center rounded-2xl transition-opacity duration-fast"
      style={{
        width: PLATE.w,
        height: PLATE.h,
        borderRadius: PLATE.rx,
        backgroundColor: `${c.tint}2e`,
        opacity: muted ? 0.55 : 1,
      }}
    >
      <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true">
        {c.draw}
      </svg>
    </span>
  )
}
