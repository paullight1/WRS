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
  compact = false,
}) {
  const colors = resolveColors(config)
  const drag = useRef({ x: 0, y: 0, active: false, px: 0, py: 0 })

  const onDown = (e) => {
    if (!interactive) return
    drag.current.active = true
    drag.current.px = e.clientX
    drag.current.py = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    const d = drag.current
    if (!interactive || !d.active) return
    d.y += (e.clientX - d.px) * 0.011
    d.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, d.x + (e.clientY - d.py) * 0.006))
    d.px = e.clientX
    d.py = e.clientY
  }
  const onUp = (e) => {
    drag.current.active = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  /* Thumbnails get a tighter frame — margin that reads as air at 260px reads
     as a shrunken robot at 88px. */
  return (
    <Canvas
      frameloop={frameloop}
      dpr={dpr}
      camera={{ fov: 32, position: [0, 0.15, compact ? 5.8 : 6.6], near: 0.1, far: 20 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ touchAction: interactive ? 'none' : 'auto', cursor: interactive ? 'grab' : 'default' }}
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
