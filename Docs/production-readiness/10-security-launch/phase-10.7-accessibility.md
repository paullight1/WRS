# Phase 10.7 — Accessibility Verification

## Goal
Verify the stated WCAG 2.1 AA target with automated and manual evidence.

## Implementation
- Add axe or equivalent automated checks to key Playwright routes.
- Manually test keyboard navigation, visible focus, skip links, form labels/errors, dialogs/drawers and dynamic notifications.
- Verify screen-reader names/status announcements and non-color-only state communication.
- Test reduced motion, 200%+ zoom/reflow, touch targets and contrast.
- Make 3D/canvas content provide equivalent meaningful labels/fallbacks.

## Tests / Evidence
- Critical pages have zero agreed high-impact automated violations.
- Keyboard-only journey covers registration, navigation and key account workflows.
- Manual test evidence records any justified exceptions with remediation owner.

## Exit gate
WRS has reproducible WCAG 2.1 AA evidence for critical workflows, not only design-intent comments.