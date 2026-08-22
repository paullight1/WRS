/* -------------------------------------------------------------------------- */
/* 3D robot configuration                                                      */
/*                                                                            */
/* Everything the WebGL robot is built from lives here as plain data, so the   */
/* Customize screen can drive the render without importing any three.js.       */
/* This file must stay free of three/fiber imports — Robot3D reads it on the   */
/* main bundle to pick the SVG fallback colour.                                */
/* -------------------------------------------------------------------------- */

/** Five modules, three geometry variants each. `id` maps to a mesh in parts/. */
export const modules = [
  {
    key: 'head',
    name: 'Head Module',
    icon: 'psychology_alt',
    from: '#5b9dff',
    to: '#1d3fd6',
    options: [
      { id: 'phantom', name: 'WRS Phantom v2', desc: 'Rounded shell, wide visor' },
      { id: 'sentinel', name: 'Sentinel Mk-III', desc: 'Angular plating, brow ridge' },
      { id: 'nomad', name: 'Nomad Dome', desc: 'Domed shell, wrap band' },
    ],
  },
  {
    key: 'chassis',
    name: 'Chassis Plating',
    icon: 'shield',
    from: '#8e90a2',
    to: '#4b4f60',
    options: [
      { id: 'carbon', name: 'Carbon Weave', desc: 'Slim, low mass' },
      { id: 'titan', name: 'Titan Plate', desc: 'Heavy pauldrons' },
      { id: 'aero', name: 'Aero Shell', desc: 'Tapered, vented' },
    ],
  },
  {
    key: 'optics',
    name: 'Optics Array',
    icon: 'sensors',
    from: '#0fd6b0',
    to: '#0a7f8c',
    options: [
      { id: 'lidar360', name: 'LIDAR 360 Gen-4', desc: 'Rotating scan ring' },
      { id: 'twin', name: 'Twin Lens Pro', desc: 'Stereo depth lenses' },
      { id: 'visor', name: 'Visor Bar', desc: 'Single sweep bar' },
    ],
  },
  {
    key: 'actuators',
    name: 'Actuators',
    icon: 'settings',
    from: '#ffa63d',
    to: '#e0611a',
    options: [
      { id: 'titan', name: 'Titan Servo X', desc: 'High torque, thick' },
      { id: 'flex', name: 'Flex Cable', desc: 'Light, many joints' },
      { id: 'piston', name: 'Piston Arm', desc: 'Segmented hydraulics' },
    ],
  },
  {
    key: 'power',
    name: 'Power Cell',
    icon: 'battery_charging_full',
    from: '#4ade80',
    to: '#15803d',
    options: [
      { id: 'quantum', name: 'Quantum Core v1.4', desc: 'Chest reactor sphere' },
      { id: 'fusion', name: 'Fusion Stack', desc: 'Triple cell column' },
      { id: 'solar', name: 'Solar Fin', desc: 'Dorsal collector fins' },
    ],
  },
]

export const defaultParts = {
  head: 'phantom',
  chassis: 'carbon',
  optics: 'lidar360',
  actuators: 'titan',
  power: 'quantum',
}

/**
 * Palette name → the four colours the model is built from.
 * `emissive` is also the eye colour used by the SVG fallback.
 */
export const paletteSets = {
  'Oceania Flow': { body: '#e4e7f2', panel: '#7f8aab', accent: '#2d5bff', emissive: '#00dbe7' },
  'Neon Genesis': { body: '#f0e3ff', panel: '#6c5b8f', accent: '#a855f7', emissive: '#ddb7ff' },
  'Empire Gold': { body: '#f5e6b8', panel: '#8a6f2a', accent: '#b8860b', emissive: '#ffd700' },
  'Deep Carbon': { body: '#4a4d55', panel: '#2a2c33', accent: '#5f6373', emissive: '#8e90a2' },
  'Solar Flare': { body: '#ffd9b0', panel: '#8c4a1c', accent: '#e0611a', emissive: '#ffa63d' },
  'Verdant Core': { body: '#d5f0d9', panel: '#2f6b41', accent: '#15803d', emissive: '#4ade80' },
}

export const paletteSet = (name) => paletteSets[name] || paletteSets['Oceania Flow']

/**
 * The colours a config actually renders with. `config.colors` overrides
 * individual channels — Onboarding uses it for its free-form eye picker.
 */
export const resolveColors = (config = {}) => ({ ...paletteSet(config.palette), ...(config.colors || {}) })

/**
 * Personality → idle motion. Amplitudes are in world units / radians and are
 * multiplied by the Processing Speed slider at render time.
 */
export const personalityMotion = {
  Logical: { bob: 0.018, bobRate: 0.9, sway: 0.18, swayRate: 0.55, lean: 0, tilt: 0, armSpread: 1, pulseRate: 1.1 },
  Empathetic: {
    bob: 0.05,
    bobRate: 0.7,
    sway: 0.1,
    swayRate: 0.4,
    lean: -0.04,
    tilt: 0.11,
    armSpread: 0.97,
    pulseRate: 0.8,
  },
  Aggressive: {
    bob: 0.03,
    bobRate: 1.8,
    sway: 0.12,
    swayRate: 1.4,
    lean: 0.13,
    tilt: -0.05,
    armSpread: 1.04,
    pulseRate: 2.4,
  },
  Protective: {
    bob: 0.022,
    bobRate: 0.55,
    sway: 0.3,
    swayRate: 0.3,
    lean: -0.02,
    tilt: 0,
    armSpread: 1.1,
    pulseRate: 0.7,
  },
}

export const motionFor = (name) => personalityMotion[name] || personalityMotion.Logical

export const defaultTuning = { speed: 92, battery: 78, sensor: 64 }

/** The config every screen outside Customize renders. */
export const defaultRobotConfig = {
  palette: 'Oceania Flow',
  parts: defaultParts,
  personality: 'Logical',
  tuning: defaultTuning,
}
