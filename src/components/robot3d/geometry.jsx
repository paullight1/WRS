/* Local replacements for the two drei helpers this scene needed. Dropping the
   dependency keeps the lazy WebGL chunk meaningfully smaller, which matters on
   the mid-range Android connections this app targets. */
import { useMemo } from 'react'
import * as THREE from 'three'

/* Geometry is keyed and shared — the robot reuses a handful of box sizes and
   there is no reason to build each one twice. */
const boxCache = new Map()

function buildRoundedBox(w, h, d, radius, segments) {
  /* The bevel eats `r` from every side of a shape already inset by `r`, so
     anything above a quarter of the smallest dimension self-intersects and
     sprouts spikes. Clamp rather than trust the caller. */
  const r = Math.max(0.001, Math.min(radius, w / 4, h / 4, d / 4))
  const iw = w - r * 2
  const ih = h - r * 2

  const shape = new THREE.Shape()
  shape.moveTo(-iw / 2, -ih / 2 + r)
  shape.lineTo(-iw / 2, ih / 2 - r)
  shape.quadraticCurveTo(-iw / 2, ih / 2, -iw / 2 + r, ih / 2)
  shape.lineTo(iw / 2 - r, ih / 2)
  shape.quadraticCurveTo(iw / 2, ih / 2, iw / 2, ih / 2 - r)
  shape.lineTo(iw / 2, -ih / 2 + r)
  shape.quadraticCurveTo(iw / 2, -ih / 2, iw / 2 - r, -ih / 2)
  shape.lineTo(-iw / 2 + r, -ih / 2)
  shape.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2, -ih / 2 + r)

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(d - r * 2, 0.001),
    bevelEnabled: true,
    bevelSegments: segments,
    bevelSize: r,
    bevelThickness: r,
    curveSegments: segments,
  })
  geo.center()
  geo.computeVertexNormals()
  return geo
}

function roundedBoxGeometry(w, h, d, radius, segments) {
  const key = `${w}|${h}|${d}|${radius}|${segments}`
  let geo = boxCache.get(key)
  if (!geo) {
    geo = buildRoundedBox(w, h, d, radius, segments)
    boxCache.set(key, geo)
  }
  return geo
}

/** Drop-in for drei's RoundedBox. `smoothness` maps to bevel/curve segments. */
export function RoundedBox({ args = [1, 1, 1], radius = 0.1, smoothness = 3, children, ...props }) {
  const [w, h, d] = args
  const geometry = useMemo(() => roundedBoxGeometry(w, h, d, radius, smoothness), [w, h, d, radius, smoothness])
  return (
    <mesh geometry={geometry} {...props}>
      {children}
    </mesh>
  )
}

/* A radial-gradient sprite standing in for a contact shadow. A real shadow pass
   costs a second render every frame; at these sizes nobody can tell. */
let blobTexture
function shadowTexture() {
  if (blobTexture) return blobTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(0,4,14,0.62)')
  g.addColorStop(0.45, 'rgba(0,4,14,0.3)')
  g.addColorStop(1, 'rgba(0,4,14,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  blobTexture = new THREE.CanvasTexture(canvas)
  return blobTexture
}

export function BlobShadow({ position = [0, -1.34, 0], scale = 2.6, opacity = 0.9 }) {
  const map = useMemo(() => shadowTexture(), [])
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[scale, scale]} />
      <meshBasicMaterial map={map} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}
