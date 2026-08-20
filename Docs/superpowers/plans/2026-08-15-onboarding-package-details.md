# Onboarding Package Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-place package-details experience to onboarding and replace package portraits with a cohesive illustrated robot sprite.

**Architecture:** Keep package selection inside `Onboarding.jsx` as a local sub-state so the six-step wizard and existing save flow remain unchanged. Reuse package metadata from `src/data/mock.js`; render detail sections from data rather than duplicating plan copy. Use the existing `RobotFace` generated-sprite path for package art, preserving its SVG fallback.

**Tech Stack:** React 18, React Router, Tailwind utilities, generated PNG asset, Node test/build scripts.

## Global Constraints

- Keep the onboarding wizard at six steps.
- Do not alter package prices, server APIs, checkout behavior, or final robot-save behavior.
- Use the existing package metadata fields: `bestFor`, `features`, `deployment`, `data`, and `benefits`.
- The generated artwork must contain no text, logos, watermark, or copied branding.
- The final verification command is `npm run check`.

---

### Task 1: Generate and install package artwork

**Files:**
- Create: `public/robots/package-tier-lineup-v2.png`
- Modify: `src/components/RobotFace.jsx:91-103`

**Interfaces:**
- Consumes: `tier` and `size` props already passed by onboarding package rows.
- Produces: a six-panel vertical sprite selected by the `generated` branch, with one panel per package tier.

- [x] **Step 1: Generate the sprite**

Use the built-in image generation tool with a single vertical sprite prompt: six equal-height panels, friendly white/silver humanoid robots, blue-violet luminous accents, progressively more advanced silhouettes from Starter through Visionary, centered chest-up framing, dark indigo studio background, no text, no logos, no watermark, no cast shadows, and clean panel boundaries.

- [x] **Step 2: Inspect the generated image**

Verify that all six panels are distinct, centered, visually cohesive, and free of text or unwanted artifacts. Regenerate once with a targeted prompt adjustment if any panel is cropped or materially inconsistent.

- [x] **Step 3: Point `RobotFace` at the new asset**

Update only the generated-portrait CSS class/background asset reference and retain the existing tier position map and inline SVG fallback.

- [x] **Step 4: Verify the asset is used by the package path**

Run `rg -n "generated|package-tier-lineup" src public` and confirm the onboarding package rows use the generated branch or its updated asset path.

### Task 2: Implement package detail state

**Files:**
- Modify: `src/screens/Onboarding.jsx:14-183`

**Interfaces:**
- Consumes: the selected `pkg` slug and the existing `packages` metadata.
- Produces: a package list view, a package detail view, and a confirmed Continue action that advances to step 3.

- [x] **Step 1: Add local detail state**

Add `packageDetailsOpen` initialized to `false`. Change the step-2 Continue behavior so it opens details when `packageDetailsOpen` is false; when it is true, it closes the detail state and advances the wizard.

- [x] **Step 2: Add detail navigation behavior**

On the wizard back button, return from package details to the list before decrementing the wizard step. Keep the selected package unchanged.

- [x] **Step 3: Render the package detail view**

Use the selected package object to render its name, robot class, price, tag/badge, `bestFor` copy, feature checklist, deployment list, data list, and benefits. Keep the content within the existing mobile max-width and use the current `Card`, `Badge`, `Button`, `Icon`, and `SectionTitle` primitives.

- [x] **Step 4: Wire the package portraits**

Pass `generated` to the package-row `RobotFace` components, leaving the large `Robot3D` hero unchanged.

- [x] **Step 5: Verify interaction logic manually**

Exercise package selection, Continue, detail back, detail confirmation, and final save. Confirm that the selected package survives list/detail navigation and is still sent in the existing `/robot` patch.

### Task 3: Verify the finished onboarding change

**Files:**
- Test: existing project test/build commands; no new test file required for this UI-only state change.

**Interfaces:**
- Consumes: the completed asset and onboarding UI.
- Produces: a verified production build with no regression in existing checks.

- [x] **Step 1: Run the focused build**

Run `npm run build` and confirm Vite completes successfully.

- [x] **Step 2: Run the full project check**

Run `npm run check` and confirm all existing tests and the production build pass.

- [x] **Step 3: Review the diff**

Run `git diff --check` and `git status --short`; confirm only the intended onboarding component, robot asset reference, generated asset, and documentation/plan files are included beyond the user’s pre-existing worktree changes.
