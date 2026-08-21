# Phase 7.6 — Deployment Performance Telemetry

## Goal
Replace static hours/tasks/performance/safety values with validated operational metrics.

## Implementation
- Define task, time, quality, safety/incident and client-rating event sources.
- Validate event provenance and deduplicate repeated telemetry.
- Aggregate contract metrics with versioned calculation definitions.
- Separate estimated/live metrics from confirmed settlement metrics in UI/API.
- Add anomaly detection/operational flags for impossible or suspicious values.

## Tests / Evidence
- Duplicate telemetry does not double-count hours/tasks.
- Metric projections reconcile to source events.
- Client rating can only be recorded by an authorized contract participant/process.

## Exit gate
Every deployment performance figure has a traceable source and clearly defined confirmed/estimated status.