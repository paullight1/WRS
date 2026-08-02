import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* Metal is nothing but reflection — without an environment to reflect, a
   metalness-0.9 surface renders black. A real HDRI would be a megabyte, so this
   builds a tiny studio gradient in a canvas and pre-filters it instead. */
function studioTexture(accent) {
  const w = 64
  const h = 32
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#5c6c9a')
  sky.addColorStop(0.45, '#2b3350')
  sky.addColorStop(0.62, '#151a2b')
  sky.addColorStop(1, '#05070e')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // key softbox, so edges catch a highlight as the robot turns
  const key = ctx.createRadialGradient(w * 0.72, h * 0.24, 0, w * 0.72, h * 0.24, w * 0.24)
  key.addColorStop(0, '#ffffff')
  key.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = key
  ctx.fillRect(0, 0, w, h)

  // accent bounce from the opposite side, tinted by the active palette
  const fill = ctx.createRadialGradient(w * 0.2, h * 0.5, 0, w * 0.2, h * 0.5, w * 0.26)
  fill.addColorStop(0, accent)
  fill.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, w, h)

  const tex = new THREE.CanvasTexture(canvas)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Installs the generated environment on the scene. Renders nothing itself. */
export default function StudioEnvironment({ accent = '#2d5bff' }) {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const source = studioTexture(accent)
    const env = pmrem.fromEquirectangular(source).texture
    scene.environment = env
    source.dispose()
    pmrem.dispose()
    return () => {
      scene.environment = null
      env.dispose()
    }
  }, [scene, gl, accent])

  return null
}
