/* Shared material + highlight primitives for the 3D robot.
   Lives inside the lazy WebGL chunk — never import this from the main bundle. */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Painted shell material. Every mesh using it declares its own instance, which
 * is what lets ModuleGroup pulse one module without touching the others.
 * Meshes carrying this must also set `userData={SHELL}` to opt into highlight.
 */
export function ShellMat({ color, accent, metalness = 0.72, roughness = 0.34 }) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      emissive={accent}
      emissiveIntensity={0}
    />
  )
}

/** Emissive material for eyes, cores and trim. Untouched by the highlight pass. */
export function GlowMat({ color, intensity = 1.6 }) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} />
}

/** Dark inset material — visors, joints, cavities. */
export function DarkMat({ roughness = 0.25 }) {
  return <meshStandardMaterial color="#0b1020" metalness={0.4} roughness={roughness} />
}

/** Spread onto any mesh that should light up when its module is selected. */
export const SHELL = { shell: true }

/**
 * Wraps one module. When `active`, its shell meshes breathe their emissive so
 * the user can see exactly which part they are editing.
 */
export function ModuleGroup({ active = false, rate = 1, children, ...props }) {
  const ref = useRef()

  useFrame((state) => {
    const group = ref.current
    if (!group) return
    const t = active ? 0.1 + 0.09 * Math.sin(state.clock.elapsedTime * 4 * rate) : 0
    group.traverse((o) => {
      if (o.isMesh && o.userData.shell && o.material) o.material.emissiveIntensity = t
    })
  })

  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}
