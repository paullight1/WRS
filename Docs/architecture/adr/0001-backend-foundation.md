# ADR 0001: Start with a modular Node API and replaceable repository

## Status

Accepted

## Decision

Build the first backend slice as a Node.js HTTP service with explicit modules for configuration, validation, authentication, storage, and request routing. Use a local JSON repository for deterministic development and tests, behind a repository boundary that can be implemented by PostgreSQL.

## Rationale

The repository currently has no backend or database. Introducing a large framework and external services before contracts exist would make the first feature slices harder to verify. Node's standard library is sufficient for the initial contracts, password hashing, signed sessions, atomic local persistence, and integration tests.

## Consequences

This is suitable for local development and contract work, not a production multi-instance deployment. Before production, the repository must be replaced with PostgreSQL, secrets must come from a managed secret store, sessions must support revocation/rotation, and rate limiting/observability must be added.
