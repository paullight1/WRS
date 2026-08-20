# Supabase production setup

The WRS Supabase project is connected and the six application migrations are applied in dependency order. The application schema is in `supabase/migrations/`; the hosted migration history contains:

- WRS foundation and identity projection
- data contribution and deployment state
- operational hardening
- deployment gate and evidence integrity
- training catalogue and training integrity

The API uses a private PostgreSQL connection for application state. It does not use the Supabase Data API for these tables, so the migrations revoke `PUBLIC`, `anon`, and `authenticated` access to the core tables.

## Runtime variables

Production must set:

```text
NODE_ENV=production
WRS_PERSISTENCE_ADAPTER=postgres
WRS_DATABASE_URL=<Supabase pooled PostgreSQL connection string>
WRS_SESSION_SECRET=<32+ random characters>
WRS_ALLOWED_ORIGINS=<real HTTPS application origin>
SUPABASE_URL=<project URL>
SUPABASE_PUBLISHABLE_KEY=<browser-safe publishable key>
WRS_OBJECT_STORAGE_BUCKET=<private bucket name>
SUPABASE_SERVICE_ROLE_KEY=<server-only key, if object deletion is enabled>
```

The API now fails closed if production is configured with the JSON adapter, and `/readyz` checks the PostgreSQL dependency.

## Required dashboard actions

These settings cannot be changed by the available project integration tools and must be completed in the Supabase dashboard:

1. Enable Auth → Password → Leaked Password Protection.
2. Configure custom SMTP for reliable production delivery. The default Supabase SMTP sender is rate-limited and is not a production mail-delivery service.
3. Set the Site URL and exact redirect URL for the deployed app, using the app's `/verify` route for PKCE email confirmation (for example, `http://localhost:5173/verify` during local development).
4. Update the Confirm signup email template with `supabase/templates/confirmation.html`. It includes both the `{{ .Token }}` OTP used by the verification screen and a secure fallback link. Use `supabase/templates/recovery.html` for password recovery. The app explicitly exchanges valid PKCE callbacks and safely returns cross-browser confirmations to sign-in when the original verifier is unavailable.
5. Create a private Storage bucket for training media and configure authenticated, owner-scoped policies before enabling uploads.

## Outstanding RLS decision

The Supabase security advisor currently reports six training tables with RLS disabled: `training_consents`, `training_module_evidence`, `training_media_objects`, `training_module_versions`, `training_module_starts`, and `training_completions`.

They are not safe to expose through the Data API. Before production, a database owner must choose the access model and then apply the appropriate policy migration. For the current private-connection architecture, the minimum safe baseline is:

```sql
ALTER TABLE public.training_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_module_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_media_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_module_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_module_starts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;
```

Do not apply those statements without also confirming the database role used by `WRS_DATABASE_URL` and adding the intended policies. Enabling RLS without policies blocks non-owner access by design.

The advisor also reports informational “RLS enabled, no policy” findings on the private core tables. That is expected for the current direct-connection design, but any future browser/Data API access must use explicit least-privilege policies instead of broad grants.
