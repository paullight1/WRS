# AI Ownership Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the public landing page around WRS AI ownership value, supporting it with branded robot imagery, audience positioning, and a static Insights blog section.

**Architecture:** Keep the landing experience static and route-compatible. Store campaign copy and blog entries in `src/components/site/content.js`, keep layout primitives in `src/screens/Landing.jsx`, and use generated bitmap assets from `public/` with the real WRS logo composited in JSX rather than embedded in generated images.

**Tech Stack:** React 18, React Router, Vite, Tailwind CSS, existing site components, built-in image generation.

**Spec:** `Docs/superpowers/specs/2026-09-21-ai-ownership-landing-design.md`

## Global Constraints

- No “launching soon,” “coming soon,” or equivalent launch-status messaging.
- Avoid guaranteed-income claims; use approved work, eligibility, and potential rewards language.
- Preserve light/dark theme behavior and existing navigation anchors/routes.
- Use `/wrs-logo-footer.png` for accurate logo overlays; generated images must be text-free and watermark-free.
- Keep the final homepage CTA singular.

## Review Focus

- Mobile hero copy and imagery must not collide or become unreadable.
- Dark mode must retain contrast for white cards and violet accents.
- Generated images must not contain incorrect text or logos.
- Blog cards must remain static and not introduce broken navigation.
- Existing homepage anchors and registration links must remain functional.

### Task 1: Campaign content model

**Files:**
- Modify: `src/components/site/content.js`

**Interfaces:**
- Produces: `valuePillars`, `audienceGroups`, and `insights` arrays consumed by the landing layout.

- [ ] Add the approved hero copy, five value pillars, four audience groups, and three Insights entries as plain data.
- [ ] Rewrite the six-step loop and feature copy to use “create, train, deploy, approved work” language.
- [ ] Search the content file for forbidden launch-status phrases and verify none are present.

### Task 2: Generate and stage robot imagery

**Files:**
- Create: `public/robot-ai-employee.png`
- Create: `public/robot-training-lab.png`
- Create: `public/robot-deployment-city.png`
- Create: `public/robot-ownership-network.png`
- Create: `public/robot-editorial-portrait.png`

**Interfaces:**
- Produces: text-free raster assets referenced by `Landing.jsx`.

- [ ] Generate five distinct white/graphite robot scenes with electric-violet lighting, using the supplied flyers only as style references.
- [ ] Require no text, no logo, no watermark, no launch banners, and no copied flyer layout.
- [ ] Inspect every output and copy accepted assets into `public/` with the role-based names above.

### Task 3: Landing page conversion sections

**Files:**
- Modify: `src/screens/Landing.jsx`

**Interfaces:**
- Consumes: content arrays from Task 1 and image paths from Task 2.
- Produces: responsive hero, value pillars, product stories, audience band, Insights section, and final CTA.

- [ ] Replace the hero headline and lead with the approved ownership-economy message while preserving the existing CTA and anchor behavior.
- [ ] Add the value-pillar grid with compact icon/visual emphasis and theme-safe surfaces.
- [ ] Update the product story sections to “Your first AI employee,” “Train it for better work,” and “Deploy it into the ownership economy.”
- [ ] Add logo overlays to image cards using the existing WRS asset.
- [ ] Add the audience-fit band and static Insights cards without creating a CMS route.
- [ ] Keep only one final conversion button and ensure all new sections are mobile-friendly.

### Task 4: Verification

**Files:**
- Test: `tests/e2e/smoke.spec.js` or a focused landing assertion if the existing smoke coverage is insufficient.

- [ ] Run the landing-page browser check at mobile width and confirm hero, cards, Insights, and final CTA render.
- [ ] Run the same check in dark mode and confirm readable contrast.
- [ ] Search source and public metadata for forbidden launch-status phrases.
- [ ] Run `npm run build` and the configured landing-related lint command.
- [ ] Record any non-blocking bundle-size warning without treating it as a failure.

## Execution order

Complete Tasks 1 and 2 before Task 3. Complete Task 4 after the page is wired. Use the existing dev server for browser verification and do not alter unrelated modified files.
