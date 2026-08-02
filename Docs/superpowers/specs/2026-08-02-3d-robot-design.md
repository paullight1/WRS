# 3D Robot Rendering — Design

Date: 2026-08-02

## Goal

Replace the flat SVG robot bust with a real WebGL robot that rotates, lights up, and
reacts live to everything in the Customize screen. The robot is the emotional centre of
the product; it should feel like an object you own, not an illustration.

## Decisions

| Question | Decision |
|---|---|
| Technique | Real WebGL via three.js + react-three-fiber, procedural geometry (no downloaded assets) |
| Scope | Every hero-sized robot render (Customize, Onboarding, MyRobot, Home, RobotPassport) |
| Fidelity | Full part swapping — 3 geometry variants per module, plus live colour/trait/tuning bindings |
| Degradation | WebGL + reduced-motion detection with the existing SVG bust as fallback |

`RobotFace` (package-tier art on Packages, PackageDetail, Checkout, PaymentSuccess,
Deploy, ActiveDeployment) stays 2D — it represents a package tier, not the user's robot,
and half its uses sit inside scrollable lists.

## Architecture

```
src/data/robotParts.js          modules, options, palette material sets, personality motion
src/components/robot3d/
  Robot3D.jsx                   public API; capability detection, lazy(), Suspense → SVG
  RobotScene.jsx                Canvas, lighting, contact shadow, drag-rotate, auto-spin
  RobotModel.jsx                assembles modules, drives idle animation from personality
  materials.jsx                 ShellMat / GlowMat / ModuleGroup (highlight pulse)
  geometry.jsx                  RoundedBox + BlobShadow (local, no drei)
  environment.jsx               canvas-generated studio env map
  parts/{Head,Chassis,Optics,Actuators,PowerCell}.jsx
```

Only `three` and `@react-three/fiber` are dependencies. drei was evaluated and
dropped: its two helpers were replaced locally, which removes a dependency and a
per-frame shadow render pass.

Chassis and head variants export their mount points (`CHEST_Z`, `ARM_X`,
`FACE_Z`, `CROWN_Y`) and `RobotModel` positions the other modules against them —
otherwise a wide shell or a domed head swallows the power cell and optics.

Public API — screens never touch three.js:

```jsx
<Robot3D size={200} config={{ palette, parts, personality, tuning }} highlight="head" interactive />
```

`RobotAvatar` is untouched and becomes the fallback renderer, so a WebGL failure cannot
regress any screen.

## Part variants

| Module | Options |
|---|---|
| Head Module | Phantom v2 · Sentinel · Nomad |
| Chassis Plating | Carbon Weave · Titan Plate · Aero Shell |
| Optics Array | LIDAR 360 · Twin Lens · Visor Bar |
| Actuators | Titan Servo X · Flex Cable · Piston Arm |
| Power Cell | Quantum Core · Fusion Stack · Solar Fin |

## Live bindings

- **Palette** → body / panel / accent / emissive colours across every mesh.
- **Selected module** → that module's shell meshes pulse their emissive.
- **Personality** → idle animation. Logical: steady scan. Empathetic: bob + head tilt.
  Aggressive: forward lean, fast pulse. Protective: wide stance, slow sweep.
- **Tuning sliders** → Processing Speed drives animation rate, Battery drives core glow,
  Sensor drives optics spin.

## Performance

- three/fiber live in a lazy chunk (~225 kB gzip, essentially three.js core);
  nothing on the first-paint path changes and the main bundle carries no WebGL.
- No shadow maps and no shadow render pass — a radial-gradient sprite instead.
- Metals need something to reflect, so a 64×32 canvas gradient is PMREM-filtered
  into an environment map rather than shipping an HDRI.
- `dpr={[1, 2]}`, antialias only above 1× DPI.
- IntersectionObserver + `visibilitychange` set `frameloop="never"` when off-screen or
  backgrounded, so Home's small robot costs nothing once scrolled past.
- `prefers-reduced-motion` or missing WebGL → SVG bust at identical size, no layout shift.

## Verification

No test framework exists in this repo, so verification is a production build with a
before/after chunk-size comparison plus manual checks of each converted screen, including
one run with WebGL forced off.
