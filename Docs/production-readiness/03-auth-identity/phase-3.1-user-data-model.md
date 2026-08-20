# Phase 3.1 — User and Identity Data Model

## Goal
Replace static user identity with an authoritative account model that can support authentication, verification, permissions and auditing.

## Implementation
- Define users, profiles, identities, sessions, verification requests, devices, roles/permissions and security-event records.
- Separate mutable profile data from authentication credentials and immutable audit information.
- Add unique constraints for normalized email/phone and stable internal identifiers.
- Define lifecycle states such as pending, active, suspended and deleted.
- Add migrations, seed fixtures and least-privilege data access patterns.

## Tests / Evidence
- Migration tests from an empty database.
- Unique/foreign-key/state constraints reject invalid records.
- Sensitive fields are never exposed through default API serializers.

## Exit gate
WRS has one authoritative, migration-backed identity model suitable for all later authentication and authorization work.