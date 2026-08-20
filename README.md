# World Robotic System

Mobile-first WRS development beta with a React client and a dependency-light Node API. Core authenticated robot setup, training completion, data-task lifecycle, deployment requests, wallet reads, and mining integrity are server-backed. Provider-dependent workflows remain explicitly unavailable until their integrations are configured.

## Run the app

```bash
npm install
npm run dev      # starts the API and opens http://localhost:5173 (or next free port)
npm run build    # production bundle in dist/
```

The development command starts both the Vite frontend and the local API. Use
`npm run dev:frontend` or `npm run api` when you need to run either process
independently.

## Run the backend independently

The first backend slice is a local Node API with durable development storage in
`.wrs-data.json` (ignored by git):

```bash
npm run api       # http://127.0.0.1:8787
npm run test:api  # API contract/integration tests
```

## Training data storage and collection

The `/training` screens collect data only after the member takes an explicit action:

- Voice samples use the browser microphone through `MediaRecorder`.
- Movement and facial samples use the browser camera through `MediaRecorder`.
- Image labeling and document training use a browser file picker.
- Language training stores the phrase, selected language, and activity metadata.
- Consent is sent with every submission; the API rejects submissions without `consent.contribute: true`.

In local development, the API stores submission metadata in `.wrs-data.json` and writes binary files (audio, images, video, PDFs, DOCX, CSV, and TXT) to `.wrs-training-objects/<user-id>/<YYYY-MM>/<submission-id>.<ext>`. The file is never returned through the listing API; the client receives status and metadata only. Both paths are ignored by git.

The language catalogue shown in the module is currently static UI metadata in `src/data/mock.js`; a submitted language phrase is stored server-side as a training submission with its selected language. The server catalogue and completion state live in the same JSON store.

This local object store is a development adapter. Production must provide a durable database and a private object-storage adapter (for example S3-compatible storage or Supabase Storage) before production deployment; `WRS_OBJECT_STORAGE_ROOT` controls the local object root and `WRS_BODY_LIMIT_BYTES` controls the JSON upload ceiling.

The API exposes versioned auth, robot, dashboard, packages, training, data-task
catalogue, and wallet read endpoints. See [system architecture](Docs/architecture/ARCHITECTURE.md)
for the contract, ownership rules, and PostgreSQL migration path.

Run `npm run check` for the API tests and production build. Production deployment
requires the release gates in [docs/production-readiness.md](docs/production-readiness.md);
the JSON store is development-only.

## Supabase Auth

The browser uses Supabase Auth for signup, six-digit email-code confirmation, login, token refresh,
and logout. The API validates each Supabase access token with `auth.getUser()` before
provisioning the WRS profile, robot, and mining account on first access.

Copy `.env.example` to `.env`, then set the project publishable key in both
`VITE_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_PUBLISHABLE_KEY`. The project URL is
already set for the connected WRS Supabase project. Do not use a `service_role` key
in any `VITE_*` variable. Add `http://localhost:5173/verify` to Supabase Auth's
redirect URL allowlist. Because this app uses password signup, edit Supabase Dashboard →
Authentication → Email Templates → Confirm signup and include `{{ .Token }}` in the
email body; the `/verify` screen submits
that six-digit code with `supabase.auth.verifyOtp({ email, token, type: 'email' })`.
For actual delivery, configure a custom SMTP provider in Supabase Authentication →
SMTP Settings. Supabase's default SMTP is limited to pre-authorized team addresses
and is intended for testing only. See the [custom SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

When the Supabase variables are absent, the local HMAC auth implementation remains
available for deterministic API tests and offline development.

Product direction, feature phases, community leadership, validation, the data economy,
trust controls, and information architecture are indexed in [WRS documentation](Docs/README.md).

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
| `/packages` `/packages/:slug` | Access packages + comparison table + detail |
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
