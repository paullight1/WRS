/* -------------------------------------------------------------------------- */
/* Deployment worksites                                                        */
/*                                                                            */
/* One entry per sector the robot can be deployed into: what the robot is      */
/* actually doing there, and the colours its scene is lit with.                */
/*                                                                            */
/* Plain data, no three.js — the screens and the 2D fallback poster read this  */
/* from the main bundle, and only the WebGL chunk turns it into geometry.      */
/* -------------------------------------------------------------------------- */

export const worksites = {
  agriculture: {
    name: 'Agriculture',
    task: 'Scanning crop rows and logging yield',
    icon: 'potted_plant',
    accent: '#128b57',
    glow: '#3ddc97',
    floor: '#101a15',
    poster: 'rows',
  },
  manufacturing: {
    name: 'Manufacturing',
    task: 'Feeding parts onto the assembly line',
    icon: 'factory',
    accent: '#d9660f',
    glow: '#f7c948',
    floor: '#171310',
    poster: 'belt',
  },
  logistics: {
    name: 'Logistics & Warehousing',
    task: 'Moving pallets between storage racks',
    icon: 'local_shipping',
    accent: '#0f8fa0',
    glow: '#00dbe7',
    floor: '#0d151b',
    poster: 'stack',
  },
  healthcare: {
    name: 'Healthcare',
    task: 'Running supplies between hospital wards',
    icon: 'medical_services',
    accent: '#2f6bff',
    glow: '#8fd3ff',
    floor: '#0e1220',
    poster: 'cross',
  },
  hospitality: {
    name: 'Hospitality',
    task: 'Greeting guests and handling luggage',
    icon: 'apartment',
    accent: '#8b2fd6',
    glow: '#ddb7ff',
    floor: '#15101d',
    poster: 'arc',
  },
  retail: {
    name: 'Retail',
    task: 'Restocking shelves and checking prices',
    icon: 'storefront',
    accent: '#d81b7a',
    glow: '#ffa7d1',
    floor: '#180e15',
    poster: 'grid',
  },
  construction: {
    name: 'Construction',
    task: 'Lifting steel into the frame',
    icon: 'engineering',
    accent: '#b07d00',
    glow: '#f7c948',
    floor: '#15130c',
    poster: 'frame',
  },
  security: {
    name: 'Security',
    task: 'Sweeping the perimeter on night patrol',
    icon: 'shield',
    accent: '#5b4bff',
    glow: '#b8c3ff',
    floor: '#0b0d18',
    poster: 'radar',
  },
  education: {
    name: 'Education',
    task: 'Walking a class through a lesson',
    icon: 'school',
    accent: '#0f8fa0',
    glow: '#8fd3ff',
    floor: '#0d1418',
    poster: 'board',
  },
}

/* Sector names are written differently in different places — the industry list
   says "Logistics & Warehousing", a live contract says "Logistics Industry".
   Match on keywords instead of demanding an exact string.

   Order matters: "hospitality" contains "hospital", so it has to be tested
   before healthcare or every hotel becomes a ward. */
const ALIASES = [
  ['hospitality', ['hospitality', 'hotel', 'tourism', 'concierge', 'guest']],
  ['logistics', ['logistic', 'warehous', 'supply chain', 'delivery', 'fulfil']],
  ['manufacturing', ['manufactur', 'factory', 'production', 'industrial', 'assembly']],
  ['agriculture', ['agricultur', 'farm', 'crop', 'field', 'harvest']],
  ['healthcare', ['health', 'hospital', 'medical', 'clinic', 'ward', 'care']],
  ['retail', ['retail', 'store', 'shop', 'customer service', 'checkout']],
  ['construction', ['construct', 'build', 'site work', 'engineering']],
  ['security', ['security', 'patrol', 'surveill', 'monitor', 'guard']],
  ['education', ['education', 'school', 'learn', 'teach', 'tutor', 'academy']],
]

/** Sector key for any industry label the app happens to be holding. */
export function worksiteKey(label = '') {
  const s = String(label).toLowerCase()
  for (const [key, words] of ALIASES) if (words.some((w) => s.includes(w))) return key
  return 'logistics'
}

/** The worksite a given industry label renders as. Never returns undefined. */
export const worksiteFor = (label) => worksites[worksiteKey(label)]
