import { RoundedBox } from '../geometry.jsx'
import { DarkMat, ShellMat, SHELL } from '../materials.jsx'

/* Torso shells, centred on the origin. Each variant exposes a chest face near
   z = 0.4 for the power cell, and shoulder mounts at x = ±0.62, y = 0.34. */

function CarbonWeave({ c }) {
  return (
    <>
      <RoundedBox args={[1.16, 1.12, 0.72]} radius={0.2} smoothness={4} userData={SHELL}>
        <ShellMat color={c.body} accent={c.accent} />
      </RoundedBox>
      {/* weave seams */}
      {[-0.26, 0.26].map((y) => (
        <mesh key={y} position={[0, y, 0.355]}>
          <boxGeometry args={[0.62, 0.018, 0.018]} />
          <DarkMat />
        </mesh>
      ))}
      {/* shoulder caps */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.62, 0.34, 0]} userData={SHELL}>
          <sphereGeometry args={[0.22, 20, 14]} />
          <ShellMat color={c.panel} accent={c.accent} />
        </mesh>
      ))}
      {/* waist */}
      <RoundedBox args={[0.68, 0.24, 0.56]} radius={0.1} position={[0, -0.66, 0]} userData={SHELL}>
        <ShellMat color={c.panel} accent={c.accent} />
      </RoundedBox>
    </>
  )
}

function TitanPlate({ c }) {
  return (
    <>
      <RoundedBox args={[1.26, 1.16, 0.84]} radius={0.16} smoothness={3} userData={SHELL}>
        <ShellMat color={c.body} accent={c.accent} metalness={0.82} roughness={0.3} />
      </RoundedBox>
      {/* pauldrons */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[0.46, 0.42, 0.72]}
          radius={0.14}
          position={[s * 0.68, 0.4, 0]}
          rotation={[0, 0, s * -0.22]}
          userData={SHELL}
        >
          <ShellMat color={c.panel} accent={c.accent} metalness={0.82} roughness={0.3} />
        </RoundedBox>
      ))}
      {/* armour ribs */}
      {[-0.3, 0.06].map((y) => (
        <RoundedBox key={y} args={[1.02, 0.12, 0.06]} radius={0.03} position={[0, y, 0.43]} userData={SHELL}>
          <ShellMat color={c.panel} accent={c.accent} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.78, 0.26, 0.66]} radius={0.08} position={[0, -0.68, 0]} userData={SHELL}>
        <ShellMat color={c.panel} accent={c.accent} />
      </RoundedBox>
    </>
  )
}

function AeroShell({ c }) {
  return (
    <>
      <mesh userData={SHELL}>
        <cylinderGeometry args={[0.52, 0.74, 1.14, 8]} />
        <ShellMat color={c.body} accent={c.accent} metalness={0.68} roughness={0.36} />
      </mesh>
      {/* vent slats */}
      {[-0.18, -0.02, 0.14].map((y) => (
        <mesh key={y} position={[0, y, 0.44]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.5, 0.035, 0.12]} />
          <DarkMat />
        </mesh>
      ))}
      {/* clavicle spar */}
      <mesh position={[0, 0.44, 0.1]} rotation={[0, 0, Math.PI / 2]} userData={SHELL}>
        <cylinderGeometry args={[0.09, 0.09, 1.3, 12]} />
        <ShellMat color={c.panel} accent={c.accent} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.62, 0.34, 0]} userData={SHELL}>
          <sphereGeometry args={[0.19, 18, 12]} />
          <ShellMat color={c.panel} accent={c.accent} />
        </mesh>
      ))}
      <mesh position={[0, -0.68, 0]} userData={SHELL}>
        <cylinderGeometry args={[0.42, 0.3, 0.26, 8]} />
        <ShellMat color={c.panel} accent={c.accent} />
      </mesh>
    </>
  )
}

const VARIANTS = { carbon: CarbonWeave, titan: TitanPlate, aero: AeroShell }

/* Where the other modules bolt on. Each shell is a different size, so the power
   cell and arms have to follow it or they end up buried inside the torso. */
export const CHEST_Z = { carbon: 0.37, titan: 0.44, aero: 0.56 }
export const ARM_X = { carbon: 0.62, titan: 0.78, aero: 0.7 }

export default function Chassis({ variant = 'carbon', colors }) {
  const V = VARIANTS[variant] || CarbonWeave
  return <V c={colors} />
}
