import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DarkMat, GlowMat, ShellMat, SHELL } from '../materials.jsx'

/* Optics sit in head-local space. `face` is the head shell's front plane and
   `crown` its top, both supplied by the head variant — a dome and a slab put
   their surfaces in very different places.
   `spin` comes from the Sensor Sensitivity slider (0–1). */

function Lidar360({ c, spin, face, crown }) {
  const ring = useRef()
  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.y += delta * (0.6 + spin * 3.4)
  })
  return (
    <>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.05, face + 0.02]}>
          <sphereGeometry args={[0.09, 16, 12]} />
          <GlowMat color={c.emissive} intensity={2.2} />
        </mesh>
      ))}
      {/* scan ring above the crown */}
      <group ref={ring} position={[0, crown, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} userData={SHELL}>
          <torusGeometry args={[0.3, 0.026, 8, 32]} />
          <ShellMat color={c.panel} accent={c.accent} />
        </mesh>
        <mesh position={[0.3, 0, 0]}>
          <sphereGeometry args={[0.055, 12, 10]} />
          <GlowMat color={c.emissive} intensity={2.6} />
        </mesh>
      </group>
    </>
  )
}

function TwinLens({ c, spin, face }) {
  const iris = useRef([])
  useFrame((state) => {
    const s = 1 + Math.sin(state.clock.elapsedTime * (1 + spin * 3)) * 0.12
    iris.current.forEach((m) => m && m.scale.setScalar(s))
  })
  return (
    <>
      {[-0.24, 0.24].map((x, i) => (
        <group key={x} position={[x, 0.05, face - 0.04]}>
          <mesh userData={SHELL}>
            <cylinderGeometry args={[0.17, 0.19, 0.14, 20]} />
            <ShellMat color={c.panel} accent={c.accent} />
          </mesh>
          <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.04, 20]} />
            <DarkMat />
          </mesh>
          <mesh ref={(el) => (iris.current[i] = el)} position={[0, 0, 0.12]}>
            <sphereGeometry args={[0.075, 16, 12]} />
            <GlowMat color={c.emissive} intensity={2.4} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function VisorBar({ c, spin, face }) {
  const sweep = useRef()
  useFrame((state) => {
    if (sweep.current) sweep.current.position.x = Math.sin(state.clock.elapsedTime * (0.7 + spin * 2)) * 0.26
  })
  return (
    <group position={[0, 0.05, face + 0.01]}>
      <mesh>
        <boxGeometry args={[0.74, 0.15, 0.04]} />
        <GlowMat color={c.emissive} intensity={1.1} />
      </mesh>
      <mesh ref={sweep}>
        <boxGeometry args={[0.16, 0.16, 0.06]} />
        <GlowMat color={c.emissive} intensity={3.2} />
      </mesh>
    </group>
  )
}

const VARIANTS = { lidar360: Lidar360, twin: TwinLens, visor: VisorBar }

export default function Optics({ variant = 'lidar360', colors, spin = 0.5, face = 0.44, crown = 0.58 }) {
  const V = VARIANTS[variant] || Lidar360
  return <V c={colors} spin={spin} face={face} crown={crown} />
}
