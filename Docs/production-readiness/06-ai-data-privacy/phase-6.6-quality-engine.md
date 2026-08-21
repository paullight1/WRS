# Phase 6.6 — Data Quality Engine

## Goal
Replace hard-coded quality scores with reproducible review/validation metrics.

## Implementation
- Define measurable dimensions such as completeness, accuracy, consistency, signal quality, reviewer agreement and policy compliance.
- Calculate per-submission quality from machine checks and/or human review with versioned scoring rules.
- Aggregate contributor quality without letting package price override data quality.
- Store score inputs/rule version so historical scores can be explained.
- Define appeal/re-review and anti-gaming controls.

## Tests / Evidence
- Known fixtures produce expected quality outcomes.
- Rule-version changes do not silently rewrite old evidence.
- Rejected/low-quality submissions cannot award the same benefits as approved work.

## Exit gate
The quality score displayed to a user is traceable to real reviewed contributions and documented scoring rules.