# WRS Admin Console

This standalone React/Vite workspace builds the operator console for eventual hosting at `admin.worldroboticsystem.com`. It reuses the WRS auth provider, account API client, session cookies, and server-side operations permissions from the repository root. It does not contain a second identity system or privileged API implementation.

## Local development

From the repository root:

```sh
npm run dev:admin
```

The console is served at `http://127.0.0.1:5175`. Sign in with an existing WRS account that has an operations role. The app uses the root Vite API middleware for local API requests. Build the separate customer and admin applications with `npm run build` and `npm run build:admin` respectively.

When local API development has no WRS signing secret, Vite enables a bounded, process-local rate limiter so auth requests do not fail at the configuration check. It is development-only; production continues to require the server signing secret and PostgreSQL distributed limiter. Local sign-in still requires the server-side Supabase URL and keys in the root environment; never put secret keys in browser `VITE_*` variables.

The console defaults to light mode. Its light/dark choice is stored under `wrs-admin-theme`, separate from customer app preferences.

## Vercel project setup (when ready)

Create a separate Vercel project for the admin frontend and set:

- **Root Directory:** `admin`
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output Directory:** `dist`
- **Install command:** `npm install` from the repository workspace lockfile
- Enable access to source files outside the project Root Directory. The admin workspace imports shared auth, policy, and API client modules from `../src` and local API middleware from `../scripts`.
- **Environment variable:** `VITE_WRS_API_ORIGIN=https://worldroboticsystem.com` (an origin only; no path, query, or trailing endpoint path). Production admin builds fail if this is empty.
- Configure the shared public auth/runtime variables required by `src/lib/runtimeConfig.js`: `VITE_WRS_MODE=production`, `VITE_WRS_AUTHORITY_URL=https://worldroboticsystem.com`, and `VITE_WRS_IDENTITY_SERVICE=true`. The shared runtime currently also requires `VITE_WRS_PAYMENT_SERVICE`, `VITE_WRS_ROBOT_SERVICE`, `VITE_WRS_DATA_SERVICE`, `VITE_WRS_REWARD_SERVICE`, `VITE_WRS_DEPLOYMENT_SERVICE`, and `VITE_WRS_SUPPORT_SERVICE` to be enabled for a production build. If OAuth is enabled on the API, set `VITE_WRS_OAUTH_ENABLED=true`; otherwise leave it false.

Set each of those service flags to `true`. Admin production builds fail when the runtime is not explicitly in production mode, a required service is disabled, or the required WRS authority is missing. These are public frontend settings; do not place service-role keys or signing secrets in `VITE_*` variables.

The admin project's `vercel.json` supplies SPA fallback behavior for deep links and refreshes, plus a CSP that permits credentialed API requests only to the configured WRS web origin shown above. Admin builds compare `VITE_WRS_API_ORIGIN` to the `connect-src` value and fail if the CSP does not allow that exact origin.

On the existing root/API Vercel project, set `WRS_ALLOWED_WEB_ORIGINS` to the exact admin origin when the admin domain is assigned, for example `https://admin.worldroboticsystem.com`. Include any other already-authorized WRS web origins that the API must serve. The API uses exact origins for credentialed CORS and mutation-origin checks; do not use wildcards or suffix matching.

When deployment is approved, assign `admin.worldroboticsystem.com` to the admin project and configure its DNS with the target Vercel provides. This setup guide does not change DNS or deploy either project.
