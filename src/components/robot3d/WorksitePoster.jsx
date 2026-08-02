import RobotAvatar from '../RobotAvatar.jsx'

/**
 * The worksite with no WebGL: a flat poster of the same scene.
 *
 * It is not a screenshot of the 3D version and does not pretend to be. It
 * carries the same three facts — the robot, the sector's setting, and the
 * sector's colour — so a device that cannot run the canvas still sees what the
 * contract is, at the same size and with no layout shift.
 */

/* One backdrop per sector, keyed by `poster` in the worksite data and drawn in
   a 0 0 320 180 box behind the robot. They are data — a list of rects and
   circles in the sector's own colour — rather than nine hand-drawn SVGs. */
const SHAPES = {
  stack: [
    ['r', 30, 54, 52, 102], ['r', 36, 64, 40, 22], ['r', 36, 94, 40, 22], ['r', 36, 124, 40, 22],
    ['r', 238, 54, 52, 102], ['r', 244, 64, 40, 22], ['r', 244, 94, 40, 22], ['r', 244, 124, 40, 22],
  ],
  belt: [
    ['r', 24, 128, 272, 14], ['r', 60, 104, 30, 24], ['r', 140, 104, 30, 24], ['r', 220, 104, 30, 24],
    ['r', 96, 30, 128, 10],
  ],
  rows: [
    ['r', 20, 150, 280, 6], ['r', 20, 126, 280, 6], ['r', 20, 104, 280, 6],
    ['c', 60, 146, 7], ['c', 108, 146, 7], ['c', 212, 146, 7], ['c', 260, 146, 7],
    ['c', 84, 122, 6], ['c', 236, 122, 6],
  ],
  cross: [
    ['r', 24, 40, 60, 120], ['r', 236, 40, 60, 120], ['r', 132, 26, 56, 40],
    ['r', 152, 34, 16, 24], ['r', 144, 42, 32, 8],
  ],
  arc: [
    ['r', 40, 108, 240, 40], ['r', 32, 100, 256, 10], ['r', 110, 26, 100, 34],
    ['r', 244, 138, 28, 34],
  ],
  grid: [
    ['r', 176, 46, 120, 112], ['r', 184, 58, 46, 26], ['r', 240, 58, 46, 26],
    ['r', 184, 94, 46, 26], ['r', 240, 94, 46, 26], ['r', 184, 130, 102, 20],
  ],
  frame: [
    ['r', 44, 34, 8, 126], ['r', 124, 34, 8, 126], ['r', 204, 34, 8, 126], ['r', 284, 34, 8, 126],
    ['r', 36, 62, 264, 7], ['r', 36, 104, 264, 7], ['r', 92, 20, 150, 9],
  ],
  radar: [
    ['r', 26, 70, 6, 90], ['r', 86, 70, 6, 90], ['r', 228, 70, 6, 90], ['r', 288, 70, 6, 90],
    ['r', 20, 82, 280, 4], ['r', 20, 112, 280, 4],
  ],
  board: [
    ['r', 66, 24, 188, 92], ['r', 82, 44, 92, 8], ['r', 82, 62, 130, 8], ['r', 82, 80, 74, 8],
    ['r', 24, 140, 64, 8], ['r', 232, 140, 64, 8],
  ],
}

export default function WorksitePoster({ site, className = '' }) {
  const shapes = SHAPES[site.poster] || SHAPES.stack

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <svg viewBox="0 0 320 180" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id={`wp-${site.poster}`} cx="50%" cy="72%" r="70%">
            <stop offset="0%" stopColor={site.accent} stopOpacity="0.34" />
            <stop offset="100%" stopColor={site.accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="180" fill={site.floor} />
        <rect width="320" height="180" fill={`url(#wp-${site.poster})`} />

        {shapes.map((s, i) =>
          s[0] === 'c' ? (
            <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} fill={site.glow} opacity="0.42" />
          ) : (
            <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx="3" fill={site.glow} opacity="0.2" />
          ),
        )}

        {/* floor line, so the robot below is standing rather than floating */}
        <rect x="0" y="158" width="320" height="2" fill={site.accent} opacity="0.5" />
      </svg>

      <div className="absolute inset-x-0 bottom-2 flex justify-center">
        <RobotAvatar size={96} eye={site.glow} glow={false} />
      </div>
    </div>
  )
}
