# WRS Engineering Architecture

## Ownership boundaries

- **UI** — `src/components`, `src/screens`, and route composition. UI renders service/domain results and never becomes the authority for money, identity, entitlements, rewards, deployments, or privacy actions.
- **Domain** — `src/domain`. Pure business rules, state machines, types, calculations, and invariants. No React or provider SDK imports.
- **Services** — `src/services`. Use-case orchestration and interfaces consumed by UI. Services translate domain outcomes into explicit pending/success/failure results.
- **Infrastructure** — `src/infrastructure`. Provider adapters for database, auth, payments, storage, observability, and external APIs. Secrets remain server-side.
- **Safety compatibility layer** — `src/lib`. Existing production-hardening utilities remain here while they are gradually moved behind domain/service interfaces.

## Dependency direction

`UI → Services → Domain` and `Infrastructure → Service interfaces / Domain types`. Domain never imports UI or infrastructure.

## Test ownership

- `tests/unit`: deterministic domain and shared-component behavior.
- `tests/integration`: boundaries between services, domain, and adapters.
- `tests/e2e`: user-visible browser journeys.
- `tests/plan*`: executable phase/production-readiness contracts.

The current Vite frontend remains intact. Backend code may live in this repository under provider-specific infrastructure/server folders until scale justifies a separate service repository; a monorepo is deliberately deferred.
