const DEMO_LABEL = 'Demo data · illustrative only'

export function getMockDataPolicy(mode) {
  if (mode === 'demo') {
    return {
      showSensitiveMockData: true,
      requiresDemoLabel: true,
      label: DEMO_LABEL,
    }
  }

  return {
    showSensitiveMockData: false,
    requiresDemoLabel: false,
    label: '',
  }
}

export function isStaleOperationalYear(value, currentYear = new Date().getFullYear()) {
  const years = String(value || '').match(/\b20\d{2}\b/g) || []
  return years.some((year) => Number(year) < currentYear)
}

export const demoDataLabel = DEMO_LABEL
