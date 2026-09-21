# AI Ownership Landing Page Design

## Goal

Reposition the public landing page as a conversion-focused introduction to World Robotics System (WRS): a platform where people can create, train, deploy, and earn from AI-powered robots. The page should borrow the flyers' visual language—high-contrast graphite and white, electric violet accents, oversized editorial typography, robot-led imagery, and direct value statements—without copying flyer text or introducing launch-status claims.

## Audience and success criteria

The primary audience is a curious first-time visitor who wants a practical way to own and use AI. Secondary audiences are builders, businesses, developers, and future ecosystem participants.

Success means a visitor can answer these questions quickly:

1. What is WRS?
2. What value does owning a robot provide?
3. How does the create → train → deploy → earn loop work?
4. What should I do next?

The page should lead to one clear account-creation action at the hero and final CTA, avoid guaranteed-income language, and contain no “launching soon,” “coming soon,” or equivalent status messaging.

## Page structure

### 1. Hero

- WRS logo and a compact value eyebrow.
- Headline: “Own intelligence. Build the future.”
- Supporting copy explaining that visitors can create a robot, train it for digital work, deploy it, and track results.
- One primary conversion CTA plus a low-emphasis “How it works” anchor.
- Full-bleed responsive robot artwork with usable negative space for copy.
- Actual WRS logo is overlaid in markup where branding is needed; generated images must not be trusted to reproduce the logo accurately.

### 2. Value pillars

Five concise cards with small supporting visuals:

- Build your AI
- Own your intelligence
- Deploy anywhere
- Earn from approved work
- Join a global network

Copy should say “can,” “approved,” or “when eligible” where outcomes depend on task approval or availability.

### 3. Ownership loop

Retain the existing six-step product explanation, but rewrite it as a conversion story:

1. Create your robot
2. Train useful skills
3. Contribute data responsibly
4. Deploy to digital work
5. Monitor progress
6. Earn from approved outcomes

Each step remains a compact, high-contrast card with a small illustration.

### 4. Product story sections

Use three alternating editorial sections with a generated image, eyebrow, headline, and one supporting paragraph:

- “Your first AI employee” — a robot that can take on repeatable digital work.
- “Train it for better work” — skills, voice, language, movement, and task knowledge.
- “Deploy it into the ownership economy” — sectors, task tracking, and approved rewards.

The sections should keep the existing responsive mobile-first layout and avoid dense dashboard screenshots.

### 5. Audience fit

Add a four-column responsive band:

- Individuals — build an AI that grows with you.
- Businesses — automate repeatable work.
- Developers — create and deploy new capabilities.
- Investors — participate in the broader ownership ecosystem.

This is positioning copy only; it must not imply financial returns or investment guarantees.

### 6. Insights / blog

Add an “Insights” section with three static article cards to establish authority without requiring a CMS:

- “What does it mean to own an AI?”
- “From training data to useful robot skills”
- “How robot deployment work is reviewed”

Each card has a category, title, short excerpt, reading time, and a non-breaking placeholder route or anchor that can later connect to full articles. Do not invent statistics, named authors, testimonials, or published dates that imply real editorial history.

### 7. Final CTA

Close with “The future belongs to owners, not just users.” Keep one primary action only, consistent with the existing request to avoid duplicate bottom CTAs.

## Image plan

Generate six clean, text-free robot scenes using the flyers only as style references:

1. Hero: full humanoid robot, white/graphite shell, violet light, negative space for copy.
2. AI employee: robot assisting in a modern digital operations environment.
3. Training: robot learning in a bright lab with holographic interfaces.
4. Deployment: robot working in a logistics/industrial environment.
5. Ownership economy: robots, network globe, and violet city infrastructure.
6. Editorial portrait: close-up branded-feeling robot head and shoulder crop.

All generated assets should be free of words, logos, watermarks, and launch banners. The real `/wrs-logo-footer.png` asset will be composited in the UI so the brand mark remains accurate and consistent in light and dark themes. Save final assets in `public/` with role-based names and use responsive `object-cover`/`object-position` rules.

## Technical approach

- Extend `src/screens/Landing.jsx` with focused sections and reusable card/feature primitives rather than introducing a CMS or new routing subsystem.
- Extend `src/components/site/content.js` with campaign copy and static blog content.
- Add generated bitmap assets under `public/` and reference them through existing site components.
- Preserve the current light/dark theme system, with white/lavender surfaces in light mode and graphite/violet surfaces in dark mode.
- Keep all existing navigation anchors and registration routes working.
- Use actual logo overlays instead of generated logo text.

## Verification

- Run ESLint/build after implementation.
- Verify the landing page at mobile and desktop widths.
- Confirm the hero, CTA, blog cards, logo overlays, and all generated imagery are readable in both themes.
- Search source and public metadata for forbidden launch-status phrases.
- Confirm no generated image contains text or a watermark before wiring it into the page.
