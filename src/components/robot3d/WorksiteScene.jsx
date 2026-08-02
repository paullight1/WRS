import { Canvas } from '@react-three/fiber'
import { defaultRobotConfig } from '../../data/robotParts.js'
import StudioEnvironment from './environment.jsx'
import { Floor } from './worksites/kit.jsx'
import { SCENES } from './worksites/scenes.jsx'

/**
 * The WebGL half of Worksite3D: one camera framing, one lighting rig, and the
 * sector's own set dressing inside it. Every scene is authored to the same
 * volume, so the framing can be shared and a sector switch is a swap of
 * geometry rather than a new camera.
 *
 * Lazy-loaded — importing this file is what pulls three.js in.
 */
export default function WorksiteScene({
  site,
  sceneKey,
  config = defaultRobotConfig,
  still = false,
  frameloop = 'always',
  dpr = [1, 2],
}) {
  const Scene = SCENES[sceneKey] || SCENES.logistics

  return (
    <Canvas
      frameloop={frameloop}
      dpr={dpr}
      camera={{ fov: 34, position: [0, 1.2, 6.9], near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      /* Aimed below the robot's centre: the eye wants floor under a worker, and
         a level camera left the top third of every frame as empty air. */
      onCreated={({ camera }) => camera.lookAt(0, -0.5, 0)}
      style={{ touchAction: 'auto' }}
    >
      {/* Metal needs something to reflect; the same generated studio map the
          robot uses, tinted by the sector rather than by the palette. */}
      <StudioEnvironment accent={site.accent} />
      {/* Fog is what ends the floor — otherwise the plane's edge is visible and
          the worksite reads as a small stage instead of a large room. */}
      <fog attach="fog" args={[site.floor, 8.5, 22]} />

      <ambientLight intensity={0.42} />
      <directionalLight position={[4, 7, 5]} intensity={1.9} />
      <directionalLight position={[-5, 3, -4]} intensity={0.75} color={site.glow} />
      <pointLight position={[0, 1.6, 2.4]} intensity={9} distance={11} color={site.accent} />

      {/* The floor sits below the camera's aim so the robot lands in the lower
          third of the frame, where a worksite photograph would put it. */}
      <group position={[0, -1.28, 0]}>
        <Floor color={site.floor} accent={site.accent} />
        <Scene config={config} site={site} still={still} />
      </group>
    </Canvas>
  )
}
