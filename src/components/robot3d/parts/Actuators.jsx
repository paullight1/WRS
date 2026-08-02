import { RoundedBox } from '../geometry.jsx'
import { DarkMat, GlowMat, ShellMat, SHELL } from '../materials.jsx'

/* One arm is authored for the right side, then mirrored. Shoulder origin is
   (0.62, 0.34, 0); the arm hangs down from there. */

function TitanServo({ c }) {
  return (
    <>
      <mesh position={[0, -0.22, 0]} userData={SHELL}>
        <cylinderGeometry args={[0.15, 0.13, 0.46, 16]} />
        <ShellMat color={c.body} accent={c.accent} />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <DarkMat />
      </mesh>
      <mesh position={[0, -0.78, 0]} userData={SHELL}>
        <cylinderGeometry args={[0.13, 0.11, 0.48, 16]} />
        <ShellMat color={c.panel} accent={c.accent} />
      </mesh>
      <RoundedBox args={[0.2, 0.22, 0.16]} radius={0.06} position={[0, -1.09, 0]} userData={SHELL}>
        <ShellMat color={c.body} accent={c.accent} />
      </RoundedBox>
    </>
  )
}

function FlexCable({ c }) {
  return (
    <>
      {[-0.18, -0.42, -0.66, -0.9].map((y, i) => (
        <group key={y}>
          <mesh position={[0, y, 0]} userData={SHELL}>
            <cylinderGeometry args={[0.07, 0.07, 0.18, 12]} />
            <ShellMat color={i % 2 ? c.panel : c.body} accent={c.accent} />
          </mesh>
          <mesh position={[0, y - 0.12, 0]}>
            <sphereGeometry args={[0.085, 14, 10]} />
            <DarkMat />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -1.08, 0]}>
        <sphereGeometry args={[0.1, 14, 10]} />
        <GlowMat color={c.emissive} intensity={1.2} />
      </mesh>
    </>
  )
}

function PistonArm({ c }) {
  return (
    <>
      <RoundedBox args={[0.24, 0.44, 0.24]} radius={0.06} position={[0, -0.24, 0]} userData={SHELL}>
        <ShellMat color={c.body} accent={c.accent} metalness={0.85} roughness={0.26} />
      </RoundedBox>
      {/* exposed rod */}
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.34, 10]} />
        <GlowMat color={c.emissive} intensity={0.7} />
      </mesh>
      <RoundedBox args={[0.22, 0.4, 0.22]} radius={0.05} position={[0, -0.88, 0]} userData={SHELL}>
        <ShellMat color={c.panel} accent={c.accent} metalness={0.85} roughness={0.26} />
      </RoundedBox>
      <RoundedBox args={[0.18, 0.18, 0.18]} radius={0.05} position={[0, -1.16, 0]} userData={SHELL}>
        <ShellMat color={c.body} accent={c.accent} />
      </RoundedBox>
    </>
  )
}

const VARIANTS = { titan: TitanServo, flex: FlexCable, piston: PistonArm }

export default function Actuators({ variant = 'titan', colors, spread = 1, shoulderX = 0.62 }) {
  const V = VARIANTS[variant] || TitanServo
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * shoulderX * spread, 0.34, 0]} rotation={[0, 0, s * -0.06]}>
          <V c={colors} />
        </group>
      ))}
    </>
  )
}
