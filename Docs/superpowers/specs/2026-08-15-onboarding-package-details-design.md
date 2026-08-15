# Onboarding Package Details Design

## Goal

Make onboarding package selection more informative and visually aligned with the supplied reference: users should be able to inspect the selected plan's features before continuing, and package portraits should use a cohesive illustrated robot set instead of the current inline SVG faces.

## Interaction

The wizard remains six steps. On step 2, selecting a package updates the selected state. Clicking Continue changes only the package step into a detail view for the selected package. The detail view shows the package name, price, best-for description, feature checklist, deployment/data access, and benefit summary. A secondary back action returns to the package list; the primary CTA confirms the package and advances to step 3.

## Visual direction

Use one six-panel vertical raster sprite for Starter, Builder, Professional, Enterprise, Elite, and Visionary. The artwork should be inspired by the supplied reference without copying it: friendly white/silver humanoid robots, blue-violet luminous accents, distinct silhouettes and increasing capability by tier, clean studio-like framing, no text, logos, watermark, or hard-to-crop shadows. The existing onboarding hero robot remains unchanged.

## Implementation boundary

- Modify `src/screens/Onboarding.jsx` for the package detail state and content presentation.
- Modify `src/components/RobotFace.jsx` only to point generated package portraits at the new sprite and preserve the current inline SVG fallback.
- Add the generated sprite under `public/robots/`.
- Do not change package pricing, server persistence, checkout behavior, or other wizard steps.

## Acceptance criteria

- Continue on package step opens details for the currently selected plan.
- Details use the existing package metadata and are readable on mobile and desktop.
- Confirming details advances to the name step with the same selected package.
- Back from details returns to package selection without losing the selected plan.
- All six package tiers use the new cohesive artwork when generated portraits are enabled.
- Existing onboarding save behavior remains unchanged.
- `npm run check` passes after the change.
