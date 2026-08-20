# Phase 8.7 — Academy Learning Engine

## Goal
Turn course cards/progress into a real learning and assessment system.

## Implementation
- Define courses, modules, lessons, enrollments, progress, assessments and completion requirements.
- Persist lesson/progress state per user and validate completion server-side.
- Award course XP only from verified completion events.
- Model prerequisites/package restrictions explicitly.
- Replace dead Start/Continue/Resume controls with real course routing/content.

## Tests / Evidence
- Progress survives refresh/device changes.
- Skipping directly to completion endpoint cannot award completion.
- Course updates do not erase prior completion evidence.

## Exit gate
Every displayed course progress/completion value derives from persisted learning activity and defined completion rules.