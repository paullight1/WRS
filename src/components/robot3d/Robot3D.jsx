import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import RobotAvatar from '../RobotAvatar.jsx'
import { defaultRobotConfig, resolveColors } from '../../data/robotParts.js'

/* The WebGL scene is the only thing that pulls in three.js, so it is lazy —
   screens that never show a robot never download it. */
const RobotScene = lazy(() => import('./RobotScene.jsx'))

/** Cached one-off capability probe. */
let webglSupport
function supportsWebGL() {
  if (webglSupport !== undefined) return webglSupport
  try {
    const canvas = document.createElement('canvas')
    webglSupport = Boolean(
      window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    )
  } catch {
    webglSupport = false
  }
  return webglSupport
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * The robot, rendered in 3D where the device allows it and as the vector bust
 * where it does not. Screens pass a plain config object and never touch three.
 *
 * @param size        square render size in px
 * @param config      { palette, parts, personality, tuning }
 * @param highlight   module key to pulse (Customize only)
 * @param interactive allow drag-to-rotate
 */
export default function Robot3D({
  size = 160,
  config = defaultRobotConfig,
  highlight = null,
  interactive = false,
  className = '',
  label = 'WRS robot',
}) {
  const host = useRef(null)
  const [onScreen, setOnScreen] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)

  const reduced = prefersReducedMotion()
  const use3D = supportsWebGL()
  const eye = resolveColors(config).emissive

  // Stop rendering entirely when scrolled away or backgrounded. Small robots on
  // list-heavy screens then cost nothing once they leave the viewport.
  useEffect(() => {
    if (!use3D || !host.current) return undefined
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '80px' })
    io.observe(host.current)
    const onVis = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [use3D])

  const fallback = <RobotAvatar size={size} eye={eye} glow={false} />

  return (
    <div
      ref={host}
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
      data-robot3d={use3D ? 'on' : 'off'}
    >
      {use3D ? (
        <Suspense fallback={fallback}>
          <RobotScene
            config={config}
            highlight={highlight}
            interactive={interactive}
            still={reduced}
            frameloop={onScreen && pageVisible ? 'always' : 'never'}
            dpr={[1, size >= 140 ? 2 : 1.5]}
            compact={size < 120}
          />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  )
}
