import { RoundedBox } from '../geometry.jsx'
import { DarkMat, GlowMat, ShellMat, SHELL } from '../materials.jsx'

/* Head shells. The optics module draws the eyes on top of these, so each
   variant leaves a clear face plane around z = 0.4. */

function Phantom({ c }) {
  return (
    <>
      <RoundedBox args={[1.02, 0.9, 0.86]} radius={0.24} smoothness={4} userData={SHELL}>
        <ShellMat color={c.body} accent={c.accent} />
      </RoundedBox>
      {/* visor inset */}
      <RoundedBox args={[0.82, 0.44, 0.1]} radius={0.1} smoothness={3} position={[0, 0.05, 0.41]}>
        <DarkMat />
      </RoundedBox>
      {/* crown vent */}
      <RoundedBox args={[0.42, 0.06, 0.5]} radius={0.03} position={[0, 0.47, -0.05]} userData={SHELL}>
        <ShellMat color={c.panel} accent={c.accent} />
      </RoundedBox>
      {/* mouth grille */}
      <mesh position={[0, -0.29, 0.42]}>
        <boxGeometry args={[0.34, 0.035, 0.02]} />
        <GlowMat color={c.emissive} intensity={0.9} />
      </mesh>
    </>
  )
}

function Sentinel({ c }) {
  return (
    <>
      <RoundedBox args={[0.98, 0.86, 0.84]} radius={0.07} smoothness={2} userData={SHELL}>
        <ShellMat color={c.body} accent={c.accent} metalness={0.85} roughness={0.24} />
      </RoundedBox>
      {/* brow wedge */}
      <mesh position={[0, 0.29, 0.36]} rotation={[0.42, 0, 0]} userData={SHELL}>
        <boxGeometry args={[1.02, 0.26, 0.3]} />
        <ShellMat color={c.panel} accent={c.accent} metalness={0.85} roughness={0.24} />
      </mesh>
      {/* narrow slit */}
      <mesh position={[0, -0.02, 0.42]}>
        <boxGeometry args={[0.86, 0.2, 0.05]} />
        <DarkMat />
      </mesh>
      {/* jaw plate */}
      <RoundedBox args={[0.66, 0.24, 0.7]} radius={0.05} position={[0, -0.4, 0.06]} userData={SHELL}>
        <ShellMat color={c.panel} accent={c.accent} />
      </RoundedBox>
      {/* cheek fins */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.53, 0.02, -0.1]} rotation={[0, 0, s * -0.25]} userData={SHELL}>
          <boxGeometry args={[0.08, 0.5, 0.36]} />
          <ShellMat color={c.panel} accent={c.accent} />
        </mesh>
      ))}
    </>
  )
}

function Nomad({ c }) {
  return (
    <>
      <mesh position={[0, 0.06, 0]} userData={SHELL}>
        <sphereGeometry args={[0.52, 28, 20]} />
        <ShellMat color={c.body} accent={c.accent} metalness={0.6} roughness={0.42} />
      </mesh>
      {/* collar */}
      <mesh position={[0, -0.33, 0]} userData={SHELL}>
        <cylinderGeometry args={[0.44, 0.5, 0.24, 24]} />
        <ShellMat color={c.panel} accent={c.accent} />
      </mesh>
      {/* wrap band */}
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.525, 0.055, 12, 40]} />
        <DarkMat />
      </mesh>
      {/* dome ridge */}
      <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 2, 0]} userData={SHELL}>
        <torusGeometry args={[0.53, 0.035, 10, 32, Math.PI]} />
        <ShellMat color={c.panel} accent={c.accent} />
      </mesh>
    </>
  )
}

const VARIANTS = { phantom: Phantom, sentinel: Sentinel, nomad: Nomad }

/* Face plane and crown height per shell, so the optics module sits on the head
   rather than inside it. */
export const FACE_Z = { phantom: 0.44, sentinel: 0.45, nomad: 0.52 }
export const CROWN_Y = { phantom: 0.58, sentinel: 0.56, nomad: 0.66 }

export default function Head({ variant = 'phantom', colors }) {
  const V = VARIANTS[variant] || Phantom
  return <V c={colors} />
}
