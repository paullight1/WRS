import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { resolveColors } from '../../data/robotParts.js'
import { BlobShadow } from './geometry.jsx'
import StudioEnvironment from './environment.jsx'
import RobotModel from './RobotModel.jsx'

const MAX_TILT = 0.34

/** Eases the rig toward the drag target, and idles into a slow turntable. */
function Rig({ drag, autoSpin, children }) {
  const g = useRef()
  useFrame((_, delta) => {
    const rig = g.current
    if (!rig) return
    const d = drag.current
    if (autoSpin && !d.active) d.y += delta * 0.22
    const k = Math.min(1, delta * 9)
    rig.rotation.y += (d.y - rig.rotation.y) * k
    rig.rotation.x += (d.x - rig.rotation.x) * k
  })
  return (
    <group ref={g} position={[0, -0.24, 0]}>
      {children}
    </group>
  )
}

/**
 * The WebGL half of Robot3D. Lazy-loaded, so importing this file is what pulls
 * three.js into the bundle — nothing on the main chunk may import it directly.
 */
export default function RobotScene({
  config,
  highlight = null,
  interactive = false,
  still = false,
  frameloop = 'always',
  dpr = [1, 2],
  distance = 6.6,
}) {
  const colors = resolveColors(config)
  const drag = useRef({ x: 0, y: 0, active: false, pending: false, px: 0, py: 0, sx: 0, sy: 0 })

  /* Touch has to be shared with the page.
     A mouse or pen starts rotating on press — there is nothing to share.
     A finger does not: the canvas stays passive until the gesture proves
     itself horizontal, and `touch-action: pan-y` leaves vertical panning to
     the browser throughout. Claiming every touch (touch-action: none plus an
     immediate pointer capture) made the robot a dead zone you could not
     scroll past on a phone. */
  const onDown = (e) => {
    if (!interactive) return
    const d = drag.current
    d.px = d.sx = e.clientX
    d.py = d.sy = e.clientY
    if (e.pointerType === 'touch') {
      d.pending = true
      d.active = false
      return
    }
    d.active = true
    d.pending = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onMove = (e) => {
    if (!interactive) return
    const d = drag.current

    if (d.pending) {
      const dx = Math.abs(e.clientX - d.sx)
      const dy = Math.abs(e.clientY - d.sy)
      if (dx < 8 && dy < 8) return // too early to tell
      d.pending = false
      if (dy >= dx) return // a scroll — leave it to the browser
      d.active = true
      d.px = e.clientX
      d.py = e.clientY
      e.currentTarget.setPointerCapture?.(e.pointerId)
      return
    }

    if (!d.active) return
    d.y += (e.clientX - d.px) * 0.011
    d.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, d.x + (e.clientY - d.py) * 0.006))
    d.px = e.clientX
    d.py = e.clientY
  }

  const onUp = (e) => {
    drag.current.active = false
    drag.current.pending = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  return (
    <Canvas
      frameloop={frameloop}
      dpr={dpr}
      camera={{ fov: 32, position: [0, 0.15, distance], near: 0.1, far: 20 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ touchAction: interactive ? 'pan-y' : 'auto', cursor: interactive ? 'grab' : 'default' }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <StudioEnvironment accent={colors.accent} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3.5, 5, 4]} intensity={2.3} />
      <directionalLight position={[-4, 2, -3]} intensity={0.9} color={colors.accent} />
      <pointLight position={[0, -1.4, 2.6]} intensity={5} distance={8} color={colors.emissive} />

      <Rig drag={drag} autoSpin={!still}>
        <RobotModel config={config} highlight={highlight} still={still} />
      </Rig>

      <BlobShadow position={[0, -1.32, 0]} scale={2.6} />
    </Canvas>
  )
}
