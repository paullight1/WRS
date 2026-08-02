import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '../geometry.jsx'
import { DarkMat, GlowMat, ShellMat, SHELL } from '../materials.jsx'

/* Chest / back power modules. `charge` (0–1) is the Battery Optimization
   slider and drives how hard the core burns; `rate` comes from personality.
   `mount` is the chassis front plane — a wide shell would otherwise swallow
   the core whole. */

function QuantumCore({ c, charge, rate, mount }) {
  const core = useRef()
  useFrame((state) => {
    if (!core.current) return
    const p = 0.85 + Math.sin(state.clock.elapsedTime * 2 * rate) * 0.15
    core.current.material.emissiveIntensity = (0.8 + charge * 2.4) * p
    core.current.scale.setScalar(0.96 + p * 0.06)
  })
  return (
    <group position={[0, 0.02, mount - 0.03]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.12, 24]} />
        <DarkMat />
      </mesh>
      <mesh ref={core} position={[0, 0, 0.06]}>
        <sphereGeometry args={[0.15, 20, 16]} />
        <GlowMat color={c.emissive} intensity={2} />
      </mesh>
      <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]} userData={SHELL}>
        <torusGeometry args={[0.235, 0.028, 10, 32]} />
        <ShellMat color={c.panel} accent={c.accent} />
      </mesh>
    </group>
  )
}

function FusionStack({ c, charge, rate, mount }) {
  const bars = useRef([])
  useFrame((state) => {
    bars.current.forEach((m, i) => {
      if (!m) return
      const p = 0.7 + Math.sin(state.clock.elapsedTime * 2.4 * rate + i * 0.8) * 0.3
      m.material.emissiveIntensity = (0.6 + charge * 2.2) * p
    })
  })
  return (
    <group position={[0, 0.02, mount - 0.01]}>
      <RoundedBox args={[0.5, 0.62, 0.1]} radius={0.05} position={[0, 0, -0.03]}>
        <DarkMat />
      </RoundedBox>
      {[-0.15, 0, 0.15].map((x, i) => (
        <mesh key={x} ref={(el) => (bars.current[i] = el)} position={[x, 0, 0.04]}>
          <boxGeometry args={[0.08, 0.46, 0.06]} />
          <GlowMat color={c.emissive} intensity={1.6} />
        </mesh>
      ))}
      <RoundedBox args={[0.56, 0.68, 0.06]} radius={0.05} position={[0, 0, -0.06]} userData={SHELL}>
        <ShellMat color={c.panel} accent={c.accent} />
      </RoundedBox>
    </group>
  )
}

function SolarFin({ c, charge, rate, mount }) {
  const glow = useRef()
  useFrame((state) => {
    if (!glow.current) return
    glow.current.material.emissiveIntensity = (0.6 + charge * 2) * (0.8 + Math.sin(state.clock.elapsedTime * 1.6 * rate) * 0.2)
  })
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.42, 0.18, -(mount + 0.08)]} rotation={[0.22, s * 0.5, 0]} userData={SHELL}>
          <boxGeometry args={[0.42, 0.78, 0.04]} />
          <ShellMat color={c.panel} accent={c.accent} metalness={0.9} roughness={0.18} />
        </mesh>
      ))}
      <mesh ref={glow} position={[0, 0.02, mount + 0.01]}>
        <boxGeometry args={[0.3, 0.3, 0.05]} />
        <GlowMat color={c.emissive} intensity={1.4} />
      </mesh>
    </>
  )
}

const VARIANTS = { quantum: QuantumCore, fusion: FusionStack, solar: SolarFin }

export default function PowerCell({ variant = 'quantum', colors, charge = 0.8, rate = 1, mount = 0.37 }) {
  const V = VARIANTS[variant] || QuantumCore
  return <V c={colors} charge={charge} rate={rate} mount={mount} />
}
