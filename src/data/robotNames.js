const NAME_KEY = 'wrs.assigned-robot-name'

export const robotNames = [
  'Astra', 'Atlas', 'Beacon', 'Beryl', 'Bolt', 'Cinder', 'Circuit', 'Comet', 'Cosmo', 'Cypher',
  'Dawn', 'Echo', 'Eclipse', 'Ember', 'Flux', 'Forge', 'Glimmer', 'Halo', 'Helix', 'Horizon',
  'Iris', 'Juno', 'Kestrel', 'Kite', 'Lumen', 'Lyra', 'Mica', 'Milo', 'Nimbus', 'Nova',
  'Orbit', 'Orion', 'Pax', 'Pixel', 'Prism', 'Pulse', 'Quill', 'Radar', 'Raya', 'Relay',
  'Riven', 'Rook', 'Sable', 'Sage', 'Scout', 'Shimmer', 'Signal', 'Skye', 'Sol', 'Solaris',
  'Sonic', 'Spark', 'Spectra', 'Stellar', 'Summit', 'Tango', 'Terra', 'Thrive', 'Titan', 'Trace',
  'Vector', 'Vega', 'Vesper', 'Vibe', 'Vigil', 'Vision', 'Volt', 'Vortex', 'Warden', 'Wave',
  'Wisp', 'Xenon', 'Yara', 'Zenith', 'Zephyr', 'Axiom', 'Argo', 'Aero', 'Aether', 'Alto',
  'Brio', 'Coda', 'Delta', 'Duo', 'Elara', 'Fable', 'Gala', 'Indigo', 'Kairo', 'Lucent',
  'Maven', 'Nexus', 'Opal', 'Quasar', 'Radian', 'Solis', 'Tessera', 'Umbra', 'Vanta', 'Zora',
]

export function assignedRobotName() {
  if (typeof window === 'undefined') return robotNames[0]
  try {
    const existing = window.localStorage.getItem(NAME_KEY)
    if (existing && robotNames.includes(existing)) return existing
    const next = robotNames[Math.floor(Math.random() * robotNames.length)].trim()
    window.localStorage.setItem(NAME_KEY, next)
    return next
  } catch {
    return robotNames[0]
  }
}
