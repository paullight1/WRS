# Reference Robot UI Refactor Design

**Date:** 2026-08-11

**Status:** Approved for implementation planning

**Scope:** Investment packages, package detail, authenticated home, My Robot, and the shared procedural 3D robot

## Goal

Refactor the investment and robot-owner experience to closely match the two supplied mobile references while preserving WRS data integrity, routing, accessibility, responsive behavior, customization, and interactive 3D rendering.

The visual direction is a compact dark-navy robotics control interface: layered blue surfaces, restrained cyan light, emerald operational states, tabular data, rounded 16–22px panels, and one dominant modern humanoid robot per screen.

## Shared Visual System

- Product surfaces use deep ink and navy (`#06142c`, `#071120`, `#091b38`, `#10264d`) with cool blue hairlines.
- Cobalt is the primary interaction color, cyan is reserved for robot optics and environmental light, and emerald indicates active/healthy status.
- Existing Sora, Hanken Grotesk, and JetBrains Mono roles remain unchanged.
- Cards use a consistent soft radius. Buttons remain 44px or taller and include pressed, focus, loading, and disabled states where relevant.
- Layouts are phone-first at 320–430px and remain centered, narrow product canvases on larger viewports rather than stretching into generic desktop dashboards.
- Decorative glows, platforms, grids, and HUD marks are hidden from assistive technology. Reduced-motion disables auto-rotation and animated scan effects without removing status information.

## Investment Packages

### Package List

The screen contains a concise intro, one two-option segmented control, and the package content selected by that control.

`All Packages` displays six compact horizontal package cards in canonical order: Starter, Builder, Professional, Enterprise, Elite, Visionary. Each full card is a link to `/packages/:slug` and contains a distinct robot portrait, package name, robot class, short tag, tabular price, and chevron. Professional receives the only emphasized treatment.

`Compare` displays the existing comparison information in a horizontally scrollable table with a sticky category column and clear scroll affordance. The segment behaves as an accessible tab list with keyboard arrow, Home, and End support.

Presentation metadata is resolved from the canonical local six-tier catalogue and merged with matching public API content by slug. This prevents a five-row API response or missing API display fields from removing or visually breaking a tier.

### Package Detail

The detail screen uses a 300–340px navy hero containing the badge, price, short value line, robot class, and a large tier robot. A near-white sheet overlaps the hero and contains:

- included features with cyan check marks;
- a compact estimated-benefits grid;
- expandable deployment and data-access groups;
- the existing no-guaranteed-return disclaimer;
- primary checkout and secondary all-packages actions.

Unknown slugs continue to redirect to `/packages`. Copy must describe platform access and potential benefits without implying guaranteed profit.

## Home

The home screen keeps the authenticated app shell and five-item bottom navigation while adopting the reference composition:

1. Welcome header with real user display data, profile access, and notifications. No hard-coded unread count is shown.
2. A dominant `My Robot` hero linking to `/robot`. The left side contains unit, name, package, status, and battery; the right side contains one cropped modern 3D robot with a restrained cyan/blue glow and holographic platform.
3. Two wallet tiles sourced from `/wallet`: available balance and pending balance. They do not claim daily earnings.
4. Four primary shortcuts: Train, Add data, Deploy, and Wallet. Existing saved shortcut configuration remains stored and is not deleted.
5. A compact learning-progress panel containing level, XP, completed training, and progress to the next level. It does not invent robot telemetry or performance claims.

The dashboard retains explicit loading and server-error handling. Dead empty recent-content space is removed unless backed by actual data.

## My Robot

The screen becomes a single robot-identity experience:

1. Compact back/title/action header.
2. A 350–390px navy hero stage with level and XP rings, unit label, large interactive 3D robot, holographic platform, robot name, package, and quiet operational status.
3. Equal-width Overview, Training, Skills, and Analytics tabs.
4. Overview uses one grouped information list followed by the full-width Customize Robot action. Deployment requests render only when present.
5. Training retains server-backed modules. Skills and Analytics retain their truthful unavailable states until corresponding services exist.

Saved robot configuration is safely merged with defaults before rendering so partial or empty configuration cannot break the model and user customization appears consistently on Home and My Robot.

## Procedural 3D Robot

The existing lazy Three.js architecture remains. The robot is remodeled from procedural primitives rather than replaced with an external GLB.

The default silhouette becomes a modern humanoid bust with:

- a rounded white helmet and continuous black visor;
- cyan twin optics with restrained bloom;
- layered white/silver chest armor over a dark mechanical core;
- broad segmented shoulder armor and narrower articulated waist;
- dark neck, elbow, and arm joints;
- stronger heroic upper-body proportions;
- a larger luminous cyan platform and improved contact shadow;
- cool studio key light, blue rim light, and controlled emissive highlights.

All current head, chassis, optics, actuator, and power-cell choices remain valid. Variants share the improved proportion system while preserving their distinct geometry. Personality idle motion, worksite arm poses, part highlighting, horizontal drag rotation, auto-rotation, off-screen rendering pause, WebGL fallback, and reduced-motion behavior remain functional.

## Component Boundaries

- Package presentation and merge logic is isolated from screen layout.
- Reusable package tier cards, segmented controls, robot hero stages, and robot configuration merging live in focused helpers/components rather than expanding the screens into monoliths.
- Global primitives are changed only where multiple screens need the behavior; reference-only appearance remains locally scoped.
- Shared 3D geometry/material changes stay inside the lazy robot chunk so screens without robots do not load Three.js.

## Data and Error Handling

- Existing `/dashboard`, `/wallet`, `/robot`, `/training/modules`, `/deployments`, and public package APIs remain the sources of truth.
- Local package presentation metadata fills display-only gaps; it does not overwrite server-owned entitlement or checkout data.
- Partial robot configurations are deep-merged with `defaultRobotConfig`, including nested `parts` and `tuning`.
- Missing API data renders a clear unavailable state, not fabricated zeroes.
- Package checkout and disclaimer behavior remain unchanged apart from presentation and clearer action labels.

## Accessibility

- Every package card, tab, shortcut, action, and robot control has a 44px minimum target and visible focus treatment.
- Segmented controls and content tabs use correct tab roles and keyboard behavior.
- Progress rings and battery indicators have textual equivalents and programmatic labels.
- The interactive robot retains vertical touch scrolling; horizontal gestures rotate it.
- Auto-rotate controls expose `aria-pressed` and descriptive labels.
- Robot canvases and fallbacks avoid duplicate screen-reader announcements.

## Verification

- Run the existing automated check/build suite.
- Verify package list-to-detail navigation for all six slugs and compare-table alignment.
- Verify Home and My Robot using server-backed loading, success, partial-config, and error states.
- Verify robot customization still changes all five module types and palettes.
- Verify worksite poses and robot thumbnails remain functional after proportion changes.
- Inspect `/home`, `/packages`, `/packages/professional`, `/robot`, and `/robot/customize` at narrow phone and desktop-centered widths.
- Check keyboard navigation, focus visibility, reduced motion, and mobile vertical scrolling across the interactive robot.

## Non-Goals

- Adding real robot telemetry, live performance analytics, guaranteed earnings, or new financial calculations.
- Replacing the procedural model with a licensed external asset.
- Redesigning unrelated authenticated screens or the public marketing site.
