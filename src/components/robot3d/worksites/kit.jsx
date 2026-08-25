/* Set dressing for the deployment worksites.
   Every prop here is procedural — the app ships no 3D assets — and every one is
   built from the handful of primitives the robot already uses, so a worksite
   costs geometry and nothing else.

   Lives inside the lazy WebGL chunk. Never import this from the main bundle. */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, BlobShadow } from '../geometry.jsx'
import RobotModel from '../RobotModel.jsx'

/* ------------------------------------------------------------------ ground */

/**
 * Floor plus the painted lane markings every worksite has some version of.
 * The plane is far bigger than the frame so the fog, not an edge, ends it.
 */
export function Floor({ color = '#0d111c', accent = '#2f6bff', lanes = [-2.6, 2.6] }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[46, 34]} />
        <meshStandardMaterial color={color} roughness={0.88} metalness={0.14} />
      </mesh>
      {lanes.map((x) => (
        // Lifted a hair off the floor — coplanar geometry z-fights on Adreno.
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, -1]}>
          <planeGeometry args={[0.07, 18]} />
          <meshBasicMaterial color={accent} transparent opacity={0.45} />
        </mesh>
      ))}
    </>
  )
}

/** Back wall with lit bays, which is what gives the scene its depth cue. */
export function Backdrop({ color = '#080b14', accent = '#2f6bff', bays = 5, height = 5.4 }) {
  return (
    <group position={[0, 0, -7.5]}>
      <mesh position={[0, height / 2, 0]}>
        <planeGeometry args={[34, height]} />
        <meshStandardMaterial color={color} roughness={1} metalness={0} />
      </mesh>
      {Array.from({ length: bays }, (_, i) => {
        const x = (i - (bays - 1) / 2) * 3.4
        return (
          <mesh key={x} position={[x, height * 0.52, 0.02]}>
            <planeGeometry args={[0.09, height * 0.72]} />
            <meshBasicMaterial color={accent} transparent opacity={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------- props */

export function Crate({ size = [0.68, 0.56, 0.68], color = '#6b5433', accent = '#f7c948', ...props }) {
  const [w, h, d] = size
  return (
    <group {...props}>
      <RoundedBox args={size} radius={0.05}>
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.18} />
      </RoundedBox>
      {/* shipping label, so a crate reads as cargo rather than a box */}
      <mesh position={[0, h * 0.1, d / 2 + 0.004]}>
        <planeGeometry args={[w * 0.46, h * 0.18]} />
        <meshBasicMaterial color={accent} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

/** Storage racking. Uprights, shelves, and cargo sitting on them. */
export function Rack({
  bays = 2,
  levels = 3,
  width = 1.7,
  height = 2.5,
  depth = 0.85,
  color = '#28304a',
  accent = '#00dbe7',
  cargo = '#5c4a2c',
  ...props
}) {
  const span = width * bays
  return (
    <group {...props}>
      {Array.from({ length: bays + 1 }, (_, i) => {
        const x = -span / 2 + i * width
        return (
          <mesh key={`u${x}`} position={[x, height / 2, 0]}>
            <boxGeometry args={[0.11, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.6} />
          </mesh>
        )
      })}
      {Array.from({ length: levels }, (_, l) => {
        const y = (height / levels) * (l + 1) - 0.12
        return (
          <group key={`l${l}`}>
            <mesh position={[0, y, 0]}>
              <boxGeometry args={[span, 0.08, depth]} />
              <meshStandardMaterial color={color} roughness={0.45} metalness={0.65} />
            </mesh>
            <mesh position={[0, y + 0.06, depth / 2 + 0.002]}>
              <planeGeometry args={[span, 0.03]} />
              <meshBasicMaterial color={accent} transparent opacity={0.35} />
            </mesh>
            {/* pallets, skipping one slot per level so it doesn't tile */}
            {Array.from({ length: bays }, (_, b) =>
              (b + l) % 3 === 2 ? null : (
                <Crate
                  key={`c${l}${b}`}
                  size={[width * 0.62, 0.44, depth * 0.66]}
                  color={cargo}
                  accent={accent}
                  position={[-span / 2 + width * (b + 0.5), y + 0.26, 0]}
                />
              ),
            )}
          </group>
        )
      })}
    </group>
  )
}

/** A running belt. Cargo loops along it, which is the motion the eye reads. */
export function Conveyor({
  length = 5.4,
  width = 0.95,
  height = 0.72,
  speed = 0.42,
  accent = '#f7c948',
  cargo = 4,
  cargoColor = '#7a6136',
  ...props
}) {
  const items = useRef()

  useFrame((state) => {
    const g = items.current
    if (!g) return
    g.children.forEach((child, i) => {
      const t = (state.clock.elapsedTime * speed + i / cargo) % 1
      child.position.x = -length / 2 + t * length
      child.visible = t > 0.02 && t < 0.98
    })
  })

  return (
    <group {...props}>
      {/* belt bed */}
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[length, 0.1, width]} />
        <meshStandardMaterial color="#1b2133" roughness={0.85} metalness={0.2} />
      </mesh>
      {/* rollers */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-length / 2 + (length / 8) * i, height + 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, width, 8]} />
          <meshStandardMaterial color="#3b4460" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      {/* legs */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * length) / 2.6, height / 2, 0]}>
          <boxGeometry args={[0.12, height, 0.12]} />
          <meshStandardMaterial color="#252c42" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {/* edge light, so the belt line stays readable against a dark floor */}
      <mesh position={[0, height + 0.06, width / 2 + 0.002]}>
        <planeGeometry args={[length, 0.04]} />
        <meshBasicMaterial color={accent} transparent opacity={0.75} />
      </mesh>

      <group ref={items}>
        {Array.from({ length: cargo }, (_, i) => (
          <Crate
            key={i}
            size={[0.42, 0.36, 0.42]}
            color={cargoColor}
            accent={accent}
            position={[0, height + 0.25, 0]}
          />
        ))}
      </group>
    </group>
  )
}

/** A row of crops that breathes. `phase` offsets one row against the next. */
export function CropRow({ count = 7, spacing = 0.82, accent = '#3ddc97', phase = 0, ...props }) {
  const g = useRef()
  useFrame((state) => {
    const row = g.current
    if (!row) return
    const t = state.clock.elapsedTime
    row.children.forEach((plant, i) => {
      plant.rotation.z = Math.sin(t * 0.9 + i * 0.6 + phase) * 0.06
    })
  })

  return (
    <group ref={g} {...props}>
      {Array.from({ length: count }, (_, i) => {
        const x = (i - (count - 1) / 2) * spacing
        const h = 0.44 + ((i * 7) % 5) * 0.05
        return (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, h / 2, 0]}>
              <cylinderGeometry args={[0.025, 0.035, h, 6]} />
              <meshStandardMaterial color="#2f5a33" roughness={0.9} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.13, h * 0.72, 0]} rotation={[0, 0, s * -0.7]}>
                <coneGeometry args={[0.11, 0.32, 5]} />
                <meshStandardMaterial color="#2f7a45" roughness={0.85} />
              </mesh>
            ))}
            <mesh position={[0, h + 0.08, 0]}>
              <sphereGeometry args={[0.075, 10, 8]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} roughness={0.5} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Any lit surface the robot works against: a board, a monitor, a price sign. */
export function Panel({ size = [1.5, 0.95], accent = '#2f6bff', rows = 4, frame = '#1b2133', ...props }) {
  const [w, h] = size
  return (
    <group {...props}>
      <RoundedBox args={[w + 0.12, h + 0.12, 0.08]} radius={0.04}>
        <meshStandardMaterial color={frame} roughness={0.5} metalness={0.55} />
      </RoundedBox>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={accent} transparent opacity={0.16} />
      </mesh>
      {Array.from({ length: rows }, (_, i) => {
        const y = h / 2 - 0.16 - i * (h / (rows + 0.6))
        const bar = w * (0.32 + ((i * 13) % 7) / 12)
        return (
          <mesh key={i} position={[-w / 2 + bar / 2 + 0.08, y, 0.055]}>
            <planeGeometry args={[bar, 0.055]} />
            <meshBasicMaterial color={accent} transparent opacity={0.85} />
          </mesh>
        )
      })}
    </group>
  )
}

/** The sweeping wedge of a patrol scan. */
export function ScanFan({ accent = '#b8c3ff', radius = 3.4, height = 0.9, speed = 0.5, ...props }) {
  const g = useRef()
  useFrame((state) => {
    if (g.current) g.current.rotation.y = Math.sin(state.clock.elapsedTime * speed) * 1.25
  })
  return (
    <group ref={g} {...props}>
      <mesh position={[0, 0, 0]} rotation={[0, -0.35, 0]}>
        <coneGeometry args={[radius, height, 20, 1, true, 0, 0.7]} />
        <meshBasicMaterial color={accent} transparent opacity={0.2} depthWrite={false} side={2} />
      </mesh>
    </group>
  )
}

/** Airborne dust, pollen, or sparks depending on what it is tinted. */
export function Motes({ count = 14, color = '#ffffff', area = [6, 2.2, 3], speed = 0.22, size = 0.028 }) {
  const g = useRef()
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (((i * 37) % 100) / 100 - 0.5) * area[0],
        y: (((i * 61) % 100) / 100) * area[1],
        z: (((i * 17) % 100) / 100 - 0.5) * area[2],
        drift: 0.4 + (((i * 29) % 10) / 10) * 0.8,
      })),
    [count, area[0], area[1], area[2]],
  )

  useFrame((state) => {
    const grp = g.current
    if (!grp) return
    const t = state.clock.elapsedTime * speed
    grp.children.forEach((m, i) => {
      const s = seeds[i]
      m.position.y = ((s.y + t * s.drift) % area[1]) + 0.1
      m.position.x = s.x + Math.sin(t * s.drift + i) * 0.18
    })
  })

  return (
    <group ref={g}>
      {seeds.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[size, 6, 5]} />
          <meshBasicMaterial color={color} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ worker */

/**
 * The deployed robot, standing on the worksite floor.
 *
 * The model is authored around its own centre with the hover plinth at
 * y = -1.28, so the group is lifted by that much × scale to put it on the
 * ground plane rather than through it.
 *
 * @param groupRef ref onto the outer group — scenes animate the robot's path
 *   through it directly, never through React state.
 * @param work     { mode, rate } passed through to the arm poses.
 */
export function Worker({ groupRef, config, scale = 0.62, work, still = false, children, ...props }) {
  return (
    <group ref={groupRef} {...props}>
      <group scale={scale} position={[0, 1.3 * scale, 0]}>
        <RobotModel config={config} still={still} work={work} />
      </group>
      <BlobShadow position={[0, 0.012, 0]} scale={2.4 * scale} opacity={0.8} />
      {children}
    </group>
  )
}
