# Product

> This file captures the original product/design thesis. The maintained product plan,
> feature phases, trust rules, roles, and information architecture are indexed in
> [Docs/README.md](Docs/README.md). New feature decisions should use the
> [feature specification template](Docs/product/FEATURE_SPEC_TEMPLATE.md).

## Register

product

## Users

18–40, interested in AI, robotics, technology, learning, gaming, community and digital
ownership. Largely first-time users of a robotics platform — **no technical knowledge is
assumed**. Primary context is a phone, one hand, often on a mid-range Android over a
patchy connection, checking in daily for a few minutes at a time.

The job to be done: *own a robot, make it more capable, and see what that ownership is
producing.* Every session should answer "what should I do next?" and "did my robot grow?"

## Product Purpose

A mobile-first web app where a user creates, owns, customises, trains and deploys a
personal AI robot. The connected loop is:

**Own → Train → Contribute → Deploy → Monitor → Earn → Upgrade**

Success is a user who returns tomorrow: they completed a training module or data task,
saw XP move, and understood what the next step is — without instructions.

The platform also handles money and identity (packages, wallet, withdrawals, biometric
training data), so credibility is functional, not decorative.

## Brand Personality

Futuristic, premium, trustworthy. Confident but never cold; the robot is the emotional
centre and should feel like *yours*. Voice is plain and direct — a first-time user in
Lagos should understand every label without a glossary. Excitement comes from visible
growth (levels, XP, new capabilities), not from hype copy.

## Anti-references

- **Crypto dashboard.** No glowing "total portfolio" hero, no implied returns, no
  neon-on-black casino energy.
- **Banking app.** Not conservative, not form-heavy, not corporate blue.
- **Generic SaaS.** No identical icon-card grids, no eyebrow labels above every section,
  no glass on every surface.
- **Marketing site.** This is an application; screens are workspaces, not landing pages.
- Anything that presents package tiers as an investment with a guaranteed return.

## Design Principles

1. **Every screen answers "what next?"** One primary action per screen, always visible
   without scrolling on a phone.
2. **The robot is the protagonist.** Show it, show it changing. Progress is the reward.
3. **Structure follows content.** Lists read as lists, data reads as data, tappable
   things read as tappable. Don't wrap everything in the same card.
4. **Money tells the truth.** Every figure is labelled confirmed / pending / estimated /
   promotional. Never imply guaranteed earnings.
5. **Consent is visible, not buried.** Voice, face and movement capture always shows what
   is collected, what it's used for, and how to delete it.

## Accessibility & Inclusion

WCAG 2.1 AA.

- Body text ≥4.5:1 contrast; large/bold text ≥3:1. No muted-gray-on-dark body copy.
- Minimum 44×44px touch targets for every interactive element.
- Visible focus states on all controls (keyboard and switch access).
- `prefers-reduced-motion` honoured — every animation has a still or crossfade fallback.
- Status never conveyed by colour alone; pair with a label or icon.
- Safe-area insets respected on notched devices.
