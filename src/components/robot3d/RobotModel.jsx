import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { motionFor, resolveColors } from '../../data/robotParts.js'
import { GlowMat, ModuleGroup, ShellMat, SHELL } from './materials.jsx'
import Head, { CROWN_Y, FACE_Z } from './parts/Head.jsx'
import Optics from './parts/Optics.jsx'
import Chassis, { ARM_X, CHEST_Z } from './parts/Chassis.jsx'
import Actuators from './parts/Actuators.jsx'
import PowerCell from './parts/PowerCell.jsx'

/**
 * Assembles the five modules and drives the idle animation.
 *
 * @param config    { palette, parts, personality, tuning }
 * @param highlight module key currently being edited, or null
 * @param still     freeze the idle animation (reduced-motion)
 */
export default function RobotModel({ config, highlight = null, still = false }) {
  const body = useRef()
  const head = useRef()

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
          <Optics
            variant={config.parts.optics}
            colors={colors}
            spin={still ? 0 : spin}
            face={faceZ}
            crown={crownY}
          />
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
