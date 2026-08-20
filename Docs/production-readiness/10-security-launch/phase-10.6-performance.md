# Phase 10.6 — Performance and Mobile Resource Budgets

## Goal
Keep the existing rich WRS UI usable on the target mid-range mobile devices and patchy connections.

## Implementation
- Define budgets for initial JS/CSS, lazy Three.js chunks, LCP/INP/CLS, memory and network requests.
- Measure representative mobile hardware/network profiles, not desktop only.
- Preserve lazy WebGL loading, poster fallback, off-screen render-loop parking and reduced-motion behavior.
- Audit image/font delivery, route chunking, caching and unnecessary re-renders.
- Add regression thresholds to CI/lab testing where stable.

## Tests / Evidence
- Lighthouse/Web Vitals plus real-browser traces for critical routes.
- Long navigation/session checks for memory/WebGL-context leaks.
- No-WebGL and low-performance fallback remains usable.

## Exit gate
Critical WRS journeys meet documented performance budgets on representative target devices without sacrificing safe fallbacks.