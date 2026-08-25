# ADR 0002: Model validation as a staged, versioned pipeline

## Status

Accepted

## Context

WRS intends to combine automated checks, community/professional review, specialist
review, and final dataset release approval. A single `approved` flag would erase who
reviewed what, under which rubric, and whether the item is merely contribution-accepted
or legally and operationally releasable.

## Decision

Represent submissions, reviews, appeals, dataset versions, and release manifests as
separate records. Reviews append decisions against immutable submission and rubric
versions. Specialist review is conditional on project risk. Dataset release is a
separate, scoped approval over a versioned manifest with lineage and consent coverage.

Assignments enforce reviewer level/scope, active credential, conflict exclusions, and
no self-review. Corrections append a new version or decision; history is not overwritten.

## Consequences

- The system can explain decisions, calibrate reviewers, handle appeals, and prove
  dataset provenance.
- Queues and projections are more complex than a status column and need concurrency
  controls and idempotent events.
- The MVP may use staff moderation, but its records must fit the same staged model so
  Phase 2 does not require destructive migration.
- An accepted submission cannot appear in an enterprise dataset until a release manifest
  passes independent rights, privacy, quality, and safety gates.
