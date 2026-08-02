import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { defaultRobotConfig } from '../../data/robotParts.js'
import { worksiteFor, worksiteKey } from '../../data/worksites.js'
import WorksitePoster from './WorksitePoster.jsx'

/* Same rule as Robot3D: three.js lives behind this lazy boundary and nothing
   on the first-paint path may import the scene directly. */
const WorksiteScene = lazy(() => import('./WorksiteScene.jsx'))

/** Cached one-off capability probe, shared shape with Robot3D's. */
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
 * A deployment sector, rendered as the robot at work in it.
 *
 * @param industry any industry label the app is holding — "Retail",
 *   "Retail Industry", "Logistics & Warehousing" all resolve to the right
 *   scene, so callers never have to normalise first.
 * @param config   the robot to put in the scene; defaults to the stock unit.
 * @param height   frame height in px. Width is always the container's.
 */
export default function Worksite3D({
  industry,
  config = defaultRobotConfig,
  height = 208,
  className = '',
  label,
}) {
  const host = useRef(null)
  const [onScreen, setOnScreen] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)

  const key = worksiteKey(industry)
  const site = worksiteFor(industry)
  const reduced = prefersReducedMotion()
  const use3D = supportsWebGL()

  // A worksite is a much heavier scene than the bust, so parking the render
  // loop the moment it leaves the viewport matters more here, not less.
  useEffect(() => {
    if (!use3D || !host.current) return undefined
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '120px' })
    io.observe(host.current)
    const onVis = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [use3D])

  const poster = <WorksitePoster site={site} />

  /* Reduced motion still gets the scene — a still worksite is a legible
     picture of the job — but rendered on demand instead of every frame. */
  const frameloop = reduced ? 'demand' : onScreen && pageVisible ? 'always' : 'never'

  return (
    <div
      ref={host}
      className={`relative overflow-hidden ${className}`}
      style={{ height }}
      role="img"
      aria-label={label || `${site.name} worksite — ${site.task}`}
      data-worksite={key}
      data-robot3d={use3D ? 'on' : 'off'}
    >
      {use3D ? (
        <Suspense fallback={poster}>
          <WorksiteScene
            site={site}
            sceneKey={key}
            config={config}
            still={reduced}
            frameloop={frameloop}
            dpr={[1, height >= 180 ? 2 : 1.5]}
          />
        </Suspense>
      ) : (
        poster
      )}
    </div>
  )
}
