# Infrastructure

Provider adapters live here: authentication, persistence, payments, storage, observability, and external APIs. Infrastructure implements service contracts; domain code never imports infrastructure. Secrets are server-side only and environment configuration is validated before production startup/build.
