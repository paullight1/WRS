/* One scene per deployment sector. Each shows the robot doing the sector's
   actual work — the point is that a glance at /deploy tells you what a
   contract in that sector *is*, without reading a word.

   Every scene sits on a floor at y = 0 and stays inside roughly x ±3.5,
   y 0–3, z -5.5–1.5, which is the volume the shared camera framing covers.

   Lives inside the lazy WebGL chunk. */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '../geometry.jsx'
import { Backdrop, Conveyor, Crate, CropRow, Motes, Panel, Rack, ScanFan, Worker } from './kit.jsx'

/* ---------------------------------------------------------------- movement */

/**
 * Walks a group back and forth along X, turning it into the direction of
 * travel — but only partway, so the robot keeps its face toward the camera
 * instead of showing its back for half of every lap.
 */
function useTravel(ref, { from = -1.8, to = 1.8, period = 10, turn = 0.8, still = false }) {
  useFrame((state, delta) => {
    const g = ref.current
    if (!g) return
    if (still) {
      g.position.x = (from + to) / 2
      return
    }
    const p = (state.clock.elapsedTime % period) / period
    const tri = p < 0.5 ? p * 2 : 2 - p * 2
    const eased = tri * tri * (3 - 2 * tri) // slow into each turn
    g.position.x = from + (to - from) * eased
    const want = (p < 0.5 ? 1 : -1) * turn
    g.rotation.y += (want - g.rotation.y) * Math.min(1, delta * 1.6)
  })
}

/** Turns a group side to side on the spot — greeting, presenting, watching.
    `base` is the facing it sways around; a `rotation` prop would be overwritten
    by this every frame. */
function useSway(ref, { amount = 0.5, rate = 0.32, base = 0, still = false }) {
  useFrame((state) => {
    const g = ref.current
    if (!g) return
    g.rotation.y = base + (still ? 0 : Math.sin(state.clock.elapsedTime * rate) * amount)
  })
}

/* ------------------------------------------------------------ small props */

function Bollard({ accent, ...props }) {
  return (
    <group {...props}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 1, 10]} />
        <meshStandardMaterial color="#232a3f" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.03, 0]}>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Desk({ accent, ...props }) {
  return (
    <group {...props}>
      <RoundedBox args={[1.05, 0.07, 0.55]} radius={0.03} position={[0, 0.62, 0]}>
        <meshStandardMaterial color="#2b3350" roughness={0.6} metalness={0.35} />
      </RoundedBox>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.31, 0]}>
          <boxGeometry args={[0.07, 0.62, 0.07]} />
          <meshStandardMaterial color="#1c2237" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {/* a tablet left open on the desk */}
      <mesh position={[0, 0.665, 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.34, 0.22]} />
        <meshBasicMaterial color={accent} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

function Planter({ accent, ...props }) {
  return (
    <group {...props}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.22, 0.17, 0.44, 12]} />
        <meshStandardMaterial color="#232a3f" roughness={0.7} metalness={0.2} />
      </mesh>
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh
          key={a}
          position={[Math.sin(a) * 0.1, 0.62 + i * 0.06, Math.cos(a) * 0.1]}
          rotation={[0, 0, Math.sin(a) * 0.5]}
        >
          <coneGeometry args={[0.14, 0.42, 5]} />
          <meshStandardMaterial color={accent} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------- 1 logistics */

function Logistics({ config, site, still }) {
  const w = useRef()
  useTravel(w, { from: -2, to: 2, period: 12, still })

  return (
    <>
      <Backdrop color="#080d16" accent={site.accent} />
      <Rack position={[-3.4, 0, -2.4]} rotation={[0, 0.4, 0]} accent={site.glow} />
      <Rack position={[3.4, 0, -2.4]} rotation={[0, -0.4, 0]} accent={site.glow} />
      <Rack position={[0, 0, -5]} bays={3} levels={4} height={3.1} accent={site.glow} />

      {/* pallets staged on the floor, waiting to be moved */}
      <Crate position={[-2.7, 0.3, 0.7]} accent={site.glow} />
      <Crate position={[-2.7, 0.82, 0.7]} size={[0.52, 0.44, 0.52]} accent={site.glow} />
      <Crate position={[2.8, 0.3, 0.5]} accent={site.glow} />

      <Worker groupRef={w} config={config} still={still} work={{ mode: 'carry', rate: 1 }}>
        <Crate size={[0.54, 0.44, 0.44]} color="#6b5433" accent={site.glow} position={[0, 0.68, 0.46]} />
      </Worker>

      <Motes count={12} color={site.glow} area={[6, 2.4, 3]} />
    </>
  )
}

/* --------------------------------------------------------- 2 manufacturing */

function Manufacturing({ config, site, still }) {
  const press = useRef()

  useFrame((state) => {
    const p = press.current
    if (!p) return
    // Stamps on the same beat the belt delivers on.
    const t = still ? 0 : state.clock.elapsedTime * 1.5
    p.position.y = 2.05 + Math.min(0, Math.sin(t)) * 0.42
  })

  return (
    <>
      <Backdrop color="#120e0a" accent={site.accent} bays={6} />
      <Conveyor position={[0, 0, -0.6]} accent={site.glow} speed={0.36} cargo={5} />

      {/* press gantry straddling the line */}
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 1.4, -0.6]}>
          <boxGeometry args={[0.16, 2.8, 0.16]} />
          <meshStandardMaterial color="#39312a" roughness={0.45} metalness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, 2.7, -0.6]}>
        <boxGeometry args={[3.2, 0.2, 0.4]} />
        <meshStandardMaterial color="#39312a" roughness={0.45} metalness={0.75} />
      </mesh>
      <group ref={press} position={[0, 2.05, -0.6]}>
        <RoundedBox args={[0.8, 0.5, 0.6]} radius={0.06}>
          <meshStandardMaterial color="#5a4a33" roughness={0.4} metalness={0.8} />
        </RoundedBox>
        <mesh position={[0, -0.28, 0]}>
          <planeGeometry args={[0.7, 0.02]} />
          <meshBasicMaterial color={site.glow} />
        </mesh>
      </group>

      <Panel position={[-3.1, 1.7, -3.4]} rotation={[0, 0.5, 0]} size={[1.3, 0.85]} accent={site.glow} rows={5} />

      <Worker
        config={config}
        still={still}
        work={{ mode: 'stock', rate: 1.5 }}
        position={[1.5, 0, 0.5]}
        rotation={[0, -0.7, 0]}
      />

      {/* sparks off the press */}
      <Motes count={16} color={site.glow} area={[3, 1.6, 1.6]} speed={0.5} size={0.022} />
    </>
  )
}

/* ---------------------------------------------------------- 3 agriculture */

function Agriculture({ config, site, still }) {
  const w = useRef()
  const beam = useRef()
  useTravel(w, { from: -2.2, to: 2.2, period: 16, turn: 0.55, still })

  useFrame((state) => {
    if (beam.current) beam.current.material.opacity = still ? 0.14 : 0.09 + 0.06 * Math.sin(state.clock.elapsedTime * 2)
  })

  return (
    <>
      <Backdrop color="#0b1410" accent={site.accent} bays={3} height={4} />
      {/* treeline on the far edge of the field — without it the upper half of
          an outdoor scene is empty sky and the depth reads flat */}
      {Array.from({ length: 11 }, (_, i) => {
        const x = (i - 5) * 1.5
        const h = 1.5 + ((i * 31) % 7) * 0.16
        return (
          <mesh key={x} position={[x, h / 2, -6.4]}>
            <coneGeometry args={[0.55, h, 7]} />
            <meshStandardMaterial color="#16301f" roughness={0.95} />
          </mesh>
        )
      })}

      {/* tilled beds receding from the camera */}
      {[0.4, -1.1, -2.6, -4.1].map((z, i) => (
        <CropRow
          key={z}
          position={[0, 0, z]}
          count={9 - i}
          spacing={0.86 + i * 0.05}
          accent={site.glow}
          phase={i * 1.3}
        />
      ))}

      <Worker groupRef={w} config={config} still={still} work={{ mode: 'tend', rate: 0.8 }} position={[0, 0, 1.3]}>
        {/* survey beam sweeping the bed it is standing over */}
        <mesh ref={beam} position={[0, 0.42, -0.35]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.55, 0.85, 16, 1, true]} />
          <meshBasicMaterial color={site.glow} transparent opacity={0.14} depthWrite={false} side={2} />
        </mesh>
      </Worker>

      {/* pollen */}
      <Motes count={18} color={site.glow} area={[7, 2, 4]} speed={0.16} size={0.02} />
    </>
  )
}

/* ----------------------------------------------------------- 4 healthcare */

function Healthcare({ config, site, still }) {
  const w = useRef()
  useTravel(w, { from: -1.7, to: 1.7, period: 13, turn: 0.7, still })

  return (
    <>
      <Backdrop color="#0a0e1a" accent={site.accent} bays={4} height={4.4} />
      {/* corridor walls with doorways */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 3.5, 0, -2.2]}>
          <mesh position={[0, 1.5, 0]} rotation={[0, (s * -Math.PI) / 2, 0]}>
            <planeGeometry args={[6, 3]} />
            <meshStandardMaterial color="#141a2c" roughness={0.9} />
          </mesh>
          {[-1.4, 1.4].map((z) => (
            <mesh key={z} position={[s * -0.02, 1, z]} rotation={[0, (s * -Math.PI) / 2, 0]}>
              <planeGeometry args={[0.9, 1.9]} />
              <meshBasicMaterial color={site.accent} transparent opacity={0.18} />
            </mesh>
          ))}
        </group>
      ))}

      <Panel position={[0, 1.85, -4.9]} size={[1.7, 1]} accent={site.glow} rows={3} />
      <Planter accent="#2f7a45" position={[-2.6, 0, -0.4]} />

      <Worker groupRef={w} config={config} still={still} work={{ mode: 'push', rate: 1 }}>
        {/* supply trolley, pushed along in front */}
        <group position={[0, 0, 0.62]}>
          <RoundedBox args={[0.72, 0.05, 0.5]} radius={0.02} position={[0, 0.72, 0]}>
            <meshStandardMaterial color="#2b3350" roughness={0.4} metalness={0.6} />
          </RoundedBox>
          <RoundedBox args={[0.72, 0.05, 0.5]} radius={0.02} position={[0, 0.36, 0]}>
            <meshStandardMaterial color="#2b3350" roughness={0.4} metalness={0.6} />
          </RoundedBox>
          {[
            [-0.3, -0.2],
            [0.3, -0.2],
            [-0.3, 0.2],
            [0.3, 0.2],
          ].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, 0.06, z]}>
              <sphereGeometry args={[0.06, 8, 6]} />
              <meshStandardMaterial color="#11172a" roughness={0.6} />
            </mesh>
          ))}
          <Crate size={[0.3, 0.22, 0.28]} color="#e6edf7" accent={site.accent} position={[-0.16, 0.86, 0]} />
          <Crate size={[0.26, 0.18, 0.26]} color="#cfe0f5" accent={site.glow} position={[0.2, 0.84, 0]} />
        </group>
      </Worker>
    </>
  )
}

/* ---------------------------------------------------------- 5 hospitality */

function Hospitality({ config, site, still }) {
  const w = useRef()
  useSway(w, { amount: 0.45, rate: 0.3, still })

  return (
    <>
      <Backdrop color="#100b1a" accent={site.accent} bays={4} height={5} />
      {/* reception counter */}
      <group position={[0, 0, -1.5]}>
        <RoundedBox args={[4.2, 1.05, 0.7]} radius={0.08} position={[0, 0.52, 0]}>
          <meshStandardMaterial color="#241b36" roughness={0.55} metalness={0.35} />
        </RoundedBox>
        <mesh position={[0, 1.07, 0]}>
          <boxGeometry args={[4.4, 0.06, 0.86]} />
          <meshStandardMaterial color="#3a2c55" roughness={0.35} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.52, 0.36]}>
          <planeGeometry args={[4, 0.045]} />
          <meshBasicMaterial color={site.glow} transparent opacity={0.8} />
        </mesh>
      </group>

      <Panel position={[0, 2.35, -4.6]} size={[2.2, 0.7]} accent={site.glow} rows={2} />
      <Planter accent="#3b6f52" position={[-2.9, 0, -0.6]} />
      <Planter accent="#3b6f52" position={[2.9, 0, -0.6]} />

      {/* guest luggage waiting to be taken up */}
      <group position={[1.75, 0, 0.7]}>
        <RoundedBox args={[0.46, 0.66, 0.26]} radius={0.06} position={[0, 0.33, 0]}>
          <meshStandardMaterial color="#4a3a63" roughness={0.6} metalness={0.2} />
        </RoundedBox>
        <RoundedBox args={[0.38, 0.5, 0.22]} radius={0.05} position={[0.42, 0.25, 0.1]}>
          <meshStandardMaterial color="#6b5580" roughness={0.6} metalness={0.2} />
        </RoundedBox>
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[0.03, 0.14, 0.03]} />
          <meshStandardMaterial color={site.glow} emissive={site.glow} emissiveIntensity={0.8} toneMapped={false} />
        </mesh>
      </group>

      <Worker
        groupRef={w}
        config={config}
        still={still}
        work={{ mode: 'greet', rate: 0.9 }}
        position={[-0.9, 0, 0.2]}
      />
    </>
  )
}

/* --------------------------------------------------------------- 6 retail */

function Retail({ config, site, still }) {
  const w = useRef()
  useSway(w, { amount: 0.16, rate: 0.5, base: 0.35, still })

  return (
    <>
      <Backdrop color="#140a11" accent={site.accent} bays={5} height={4.6} />
      {/* shop shelving — shallower and brighter than a warehouse rack */}
      <Rack
        position={[0.9, 0, -2.4]}
        bays={3}
        levels={4}
        width={1.35}
        height={2.3}
        depth={0.6}
        color="#33203a"
        cargo="#8a3560"
        accent={site.glow}
      />
      <Rack
        position={[-3.2, 0, -2.6]}
        rotation={[0, 0.55, 0]}
        bays={2}
        levels={4}
        width={1.2}
        height={2.3}
        depth={0.55}
        color="#33203a"
        cargo="#7a3a6a"
        accent={site.glow}
      />

      <Panel position={[0.9, 2.85, -2.6]} size={[1.9, 0.5]} accent={site.glow} rows={1} frame="#2a1626" />

      {/* a stock trolley left in the aisle */}
      <group position={[2.5, 0, 0.6]}>
        <RoundedBox args={[0.66, 0.06, 0.46]} radius={0.02} position={[0, 0.4, 0]}>
          <meshStandardMaterial color="#3a2434" roughness={0.5} metalness={0.4} />
        </RoundedBox>
        <Crate size={[0.34, 0.28, 0.3]} color="#8a3560" accent={site.glow} position={[0, 0.58, 0]} />
      </group>

      <Worker
        groupRef={w}
        config={config}
        still={still}
        work={{ mode: 'stock', rate: 1.1 }}
        position={[-0.9, 0, -0.5]}
      />
    </>
  )
}

/* --------------------------------------------------------- 7 construction */

function Construction({ config, site, still }) {
  const w = useRef()
  const hook = useRef()
  useSway(w, { amount: 0.2, rate: 0.35, still })

  useFrame((state) => {
    const h = hook.current
    if (!h) return
    const t = still ? 0 : state.clock.elapsedTime * 0.5
    h.position.y = 2.6 + Math.sin(t) * 0.28
    h.rotation.z = Math.sin(t * 0.7) * 0.08
  })

  return (
    <>
      <Backdrop color="#100e08" accent={site.accent} bays={3} height={5.6} />

      {/* scaffold frame going up behind the work */}
      <group position={[0, 0, -3.4]}>
        {[-2.4, -0.8, 0.8, 2.4].map((x) => (
          <mesh key={x} position={[x, 1.8, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 3.6, 8]} />
            <meshStandardMaterial color="#5b4a1e" roughness={0.5} metalness={0.7} />
          </mesh>
        ))}
        {[0.9, 1.9, 2.9].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[5.1, 0.09, 0.09]} />
            <meshStandardMaterial color="#5b4a1e" roughness={0.5} metalness={0.7} />
          </mesh>
        ))}
        {/* a planked deck at the second lift */}
        <mesh position={[0, 1.98, 0.25]}>
          <boxGeometry args={[5, 0.06, 0.7]} />
          <meshStandardMaterial color="#6b5a2a" roughness={0.85} metalness={0.1} />
        </mesh>
      </group>

      {/* crane cable and hook, carrying the next beam in */}
      <group ref={hook} position={[1.5, 2.6, -1.4]}>
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 2.8, 6]} />
          <meshStandardMaterial color="#8e90a2" roughness={0.4} metalness={0.9} />
        </mesh>
        <mesh position={[0, -0.06, 0]}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial color={site.glow} emissive={site.glow} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, -0.34, 0]}>
          <boxGeometry args={[1.9, 0.14, 0.14]} />
          <meshStandardMaterial color="#7a6a2e" roughness={0.55} metalness={0.7} />
        </mesh>
      </group>

      <Bollard accent={site.glow} position={[-2.9, 0, 0.8]} />
      <Bollard accent={site.glow} position={[2.9, 0, 0.8]} />

      {/* steel stacked ready on the deck */}
      <group position={[-2.6, 0, -0.9]} rotation={[0, 0.2, 0]}>
        {[0, 0.16, 0.32].map((y, i) => (
          <mesh key={y} position={[i * 0.05, 0.08 + y, 0]}>
            <boxGeometry args={[2.1, 0.14, 0.34]} />
            <meshStandardMaterial color="#7a6a2e" roughness={0.6} metalness={0.7} />
          </mesh>
        ))}
      </group>

      <pointLight position={[0.4, 2.6, 1.6]} intensity={7} distance={10} color={site.glow} />

      <Worker groupRef={w} config={config} still={still} work={{ mode: 'lift', rate: 0.9 }} position={[-0.4, 0, 0.4]}>
        {/* the steel the robot is holding overhead */}
        <mesh position={[0, 1.95, 0.25]} rotation={[0, 0, 0.04]}>
          <boxGeometry args={[2, 0.15, 0.15]} />
          <meshStandardMaterial color="#a8913f" roughness={0.45} metalness={0.75} />
        </mesh>
      </Worker>

      {/* site dust */}
      <Motes count={20} color="#d8c88f" area={[7, 2.6, 4]} speed={0.14} size={0.026} />
    </>
  )
}

/* ------------------------------------------------------------- 8 security */

function Security({ config, site, still }) {
  const w = useRef()
  useTravel(w, { from: -2.3, to: 2.3, period: 15, turn: 0.75, still })

  return (
    <>
      <Backdrop color="#05070f" accent={site.accent} bays={6} height={4.8} />
      {/* perimeter fence */}
      <group position={[0, 0, -3.2]}>
        {Array.from({ length: 9 }, (_, i) => {
          const x = (i - 4) * 0.9
          return (
            <mesh key={x} position={[x, 0.9, 0]}>
              <boxGeometry args={[0.07, 1.8, 0.07]} />
              <meshStandardMaterial color="#1b2138" roughness={0.5} metalness={0.7} />
            </mesh>
          )
        })}
        {[0.7, 1.35, 1.75].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[7.4, 0.03, 0.03]} />
            <meshStandardMaterial color="#1b2138" roughness={0.5} metalness={0.7} />
          </mesh>
        ))}
      </group>

      {[-3, -1, 1, 3].map((x) => (
        <Bollard key={x} accent={site.glow} position={[x, 0, 0.9]} />
      ))}

      {/* the gate camera feed the robot is patrolling for */}
      <Panel position={[-3.1, 2, -2.6]} rotation={[0, 0.55, 0]} size={[1.2, 0.8]} accent={site.glow} rows={2} />

      {/* A night patrol has to stay legible while still reading as night: the
          robot carries its own pool of light rather than the scene being lit. */}
      <pointLight position={[0, 2.2, 1.4]} intensity={7} distance={9} color={site.glow} />

      <Worker groupRef={w} config={config} still={still} work={{ mode: 'guard', rate: 0.7 }}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.95, 1.15, 40]} />
          <meshBasicMaterial color={site.glow} transparent opacity={0.22} depthWrite={false} />
        </mesh>
        <ScanFan position={[0, 1.15, 0]} accent={site.glow} radius={3.2} height={0.9} speed={0.55} />
      </Worker>

      <Motes count={10} color={site.glow} area={[6, 2, 3]} speed={0.12} size={0.02} />
    </>
  )
}

/* ------------------------------------------------------------ 9 education */

function Education({ config, site, still }) {
  const w = useRef()
  useSway(w, { amount: 0.34, rate: 0.28, base: -0.5, still })

  return (
    <>
      <Backdrop color="#08111a" accent={site.accent} bays={4} height={4.4} />
      {/* the board being taught from */}
      <Panel position={[0.4, 1.75, -3.4]} size={[3.2, 1.7]} accent={site.glow} rows={6} frame="#16202e" />

      {/* class, seen from behind */}
      {[
        [-2.3, 0.4],
        [-0.9, 0.4],
        [-2.3, 1.5],
        [-0.9, 1.5],
        [0.5, 1.5],
      ].map(([x, z]) => (
        <Desk key={`${x}${z}`} accent={site.glow} position={[x, 0, z]} rotation={[0, Math.PI, 0]} />
      ))}

      <Planter accent="#2f7a45" position={[2.9, 0, 0.4]} />

      <Worker groupRef={w} config={config} still={still} work={{ mode: 'point', rate: 0.8 }} position={[2, 0, -1.5]} />
    </>
  )
}

/* -------------------------------------------------------------------------- */

export const SCENES = {
  agriculture: Agriculture,
  manufacturing: Manufacturing,
  logistics: Logistics,
  healthcare: Healthcare,
  hospitality: Hospitality,
  retail: Retail,
  construction: Construction,
  security: Security,
  education: Education,
}
