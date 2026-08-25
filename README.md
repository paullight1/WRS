# World Robotic System — Mock UI

Mobile-first prototype of the WRS app. **UI only** — every number, balance and status is static mock data in `src/data/mock.js`. No backend, no auth, no persistence.

## Run

```bash
npm install
npm run dev      # opens http://localhost:5173 (or next free port)
npm run build    # production bundle in dist/
```

## Stack

Vite · React 18 · React Router 6 · Tailwind CSS 3 (design tokens from the client's spec) · Material Symbols · Sora / Hanken Grotesk / JetBrains Mono.

The robot artwork is an inline SVG (`src/components/RobotAvatar.jsx`) so the prototype has no external image dependencies.

## Navigation

Bottom bar (mobile) and left drawer (desktop ≥1024px) share the same routes. Five primary tabs: Home · My Robot · Deploy · Marketplace · More.

## Screens

| Route | Screen |
| --- | --- |
| `/` | Splash |
| `/login` `/register` `/verify` | Authentication + verification |
| `/onboarding` | Robot creation flow (6 steps) |
| `/home` | Dashboard |
| `/robot` | My Robot (Overview / Training / Performance) |
| `/robot/passport` | Robot Passport |
| `/robot/customize` | Customization studio |
| `/packages` `/packages/:slug` | Investment packages + comparison table + detail |
| `/training` `/training/:slug` | AI Training Center + voice / language / movement / facial / skill / custom modules |
| `/data` `/data/:slug` `/data/quality` | Data Contribution, task detail, quality score |
| `/deploy` `/deploy/:industry` `/deploy/active` | Deployment console, sector detail, live deployment |
| `/wallet` `/wallet/transactions` `/wallet/data-revenue` | Wallet, history, AI data revenue |
| `/rewards` `/rewards/event-code` `/rewards/boosts` | Points & rewards, event codes, boosts |
| `/marketplace` `/academy` `/community` `/referrals` `/notifications` | Ecosystem |
| `/more` `/profile` `/settings` `/support` | Account |

## Compliance framing in the UI

Per the content guide, money and rewards are always labelled **Confirmed / Pending / Estimated / Promotional**, packages are presented as access tiers rather than investments with returns, and biometric/voice/movement training screens carry explicit consent toggles and deletion controls.

## Design tokens

All colours, type scale and spacing live in `tailwind.config.js` exactly as supplied. Shared primitives are in `src/components/ui.jsx` (Card, Button, Chip, Badge, Progress, ListRow, Stat, Tabs, Field, Toggle, Toast, Disclosure).
