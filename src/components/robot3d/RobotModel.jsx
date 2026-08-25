import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { motionFor, resolveColors } from '../../data/robotParts.js'
import { GlowMat, ModuleGroup, ShellMat, SHELL } from './materials.jsx'
import Head, { CROWN_Y, FACE_Z } from './parts/Head.jsx'
import Optics from './parts/Optics.jsx'
import Chassis, { ARM_X, CHEST_Z } from './parts/Chassis.jsx'
import Actuators from './parts/Actuators.jsx'
import PowerCell from './parts/PowerCell.jsx'

/* --------------------------------------------------------------- work poses
   Shoulder angles for the deployment worksites. `x` is the forward swing in
   radians (negative reaches forward), `z` widens the arm away from the torso,
   `alt` mirrors the two arms so they alternate instead of moving together.
   Each returns a pose for a phase in seconds — no state, no re-render. */
export const WORK_POSES = {
  carry: (p) => ({ x: -1.14 + Math.sin(p * 2.2) * 0.03, z: 0.14 }),
  lift: (p) => ({ x: -0.5 - 0.9 * (0.5 - Math.cos(p * 1.5) / 2), z: 0.06 }),
  stock: (p) => ({ x: -0.95 - 0.6 * Math.max(0, Math.sin(p * 1.5)), z: 0.03, alt: true }),
  tend: (p) => ({ x: -0.78 - 0.28 * Math.sin(p * 1.2), z: 0.18 }),
  walk: (p) => ({ x: 0.32 * Math.sin(p * 2.4), z: 0.02, alt: true }),
  push: () => ({ x: -1.02, z: 0.06 }),
  greet: (p) => ({ x: -0.16, z: 0.05, right: -1.42 - 0.22 * Math.sin(p * 3) }),
  point: (p) => ({ x: -0.14, z: 0.06, right: -1.72 - 0.14 * Math.sin(p * 1.1) }),
  guard: (p) => ({ x: -0.1 + 0.04 * Math.sin(p * 0.9), z: 0.22 }),
}

/**
 * Assembles the five modules and drives the idle animation.
 *
 * @param config    { palette, parts, personality, tuning }
 * @param highlight module key currently being edited, or null
 * @param still     freeze the idle animation (reduced-motion)
 * @param work      { mode, rate } — a job from WORK_POSES, driving the arms.
 *                  Omitted everywhere except the deployment worksites, so the
 *                  arms keep their authored resting pose by default.
 */
export default function RobotModel({ config, highlight = null, still = false, work = null }) {
  const body = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()

  const colors = resolveColors(config)
  const motion = motionFor(config.personality)
  const { speed = 92, battery = 78, sensor = 64 } = config.tuning || {}

  // Processing Speed scales every idle rate; the others feed one module each.
  const rate = still ? 0 : 0.6 + (speed / 100) * 0.9
  const charge = battery / 100
  const spin = sensor / 100

  // Mount points published by the chosen shells, so modules meet their surfaces.
  const chestZ = CHEST_Z[config.parts.chassis] ?? 0.37
  const armX = ARM_X[config.parts.chassis] ?? 0.62
  const faceZ = FACE_Z[config.parts.head] ?? 0.44
  const crownY = CROWN_Y[config.parts.head] ?? 0.58

  const pose = work && WORK_POSES[work.mode]

  useFrame((state) => {
    const t = state.clock.elapsedTime * rate
    if (body.current) {
      body.current.position.y = Math.sin(t * motion.bobRate * Math.PI) * motion.bob
      body.current.rotation.x = motion.lean
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * motion.swayRate * Math.PI) * motion.sway
      head.current.rotation.z = motion.tilt
    }
    if (pose && armL.current && armR.current) {
      const p = still ? 0 : state.clock.elapsedTime * (work.rate ?? 1)
      const s = pose(p)
      armR.current.rotation.x = s.right ?? s.x
      armL.current.rotation.x = s.left ?? (s.alt ? -s.x : s.x)
      armR.current.rotation.z = -0.06 - (s.z || 0)
      armL.current.rotation.z = 0.06 + (s.z || 0)
    }
  })

  return (
    <group ref={body}>
      {/* ------------------------------------------------------------- torso */}
      <ModuleGroup active={highlight === 'chassis'} rate={motion.pulseRate}>
        <Chassis variant={config.parts.chassis} colors={colors} />
      </ModuleGroup>

      <ModuleGroup active={highlight === 'power'} rate={motion.pulseRate}>
        <PowerCell
          variant={config.parts.power}
          colors={colors}
          charge={charge}
          rate={still ? 0.001 : motion.pulseRate}
          mount={chestZ}
        />
      </ModuleGroup>

      <ModuleGroup active={highlight === 'actuators'} rate={motion.pulseRate}>
        <Actuators
          variant={config.parts.actuators}
          colors={colors}
          spread={motion.armSpread}
          shoulderX={armX}
          armRefs={[armL, armR]}
        />
      </ModuleGroup>

      {/* -------------------------------------------------------------- neck */}
      <mesh position={[0, 0.63, 0]} userData={SHELL}>
        <cylinderGeometry args={[0.16, 0.2, 0.2, 16]} />
        <ShellMat color={colors.panel} accent={colors.accent} />
      </mesh>

      {/* -------------------------------------------------------------- head */}
      <group ref={head} position={[0, 1.16, 0]}>
        <ModuleGroup active={highlight === 'head'} rate={motion.pulseRate}>
          <Head variant={config.parts.head} colors={colors} />
        </ModuleGroup>
        <ModuleGroup active={highlight === 'optics'} rate={motion.pulseRate}>
          <Optics variant={config.parts.optics} colors={colors} spin={still ? 0 : spin} face={faceZ} crown={crownY} />
        </ModuleGroup>
      </group>

      {/* ------------------------------------------------------ hover plinth */}
      <mesh position={[0, -1.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.012, 8, 44]} />
        <GlowMat color={colors.emissive} intensity={0.5} />
      </mesh>
    </group>
  )
}
