# Phase 9.5 — Support Knowledge Base

## Goal
Turn dead FAQ/topic rows into useful versioned help content.

## Implementation
- Define knowledge-base articles with slug, category, status, locale, revision and ownership.
- Implement article routing and search/filtering from Support.
- Link contextual help from payment, data, deployment and account failure states.
- Add editorial publish/unpublish workflow and safe rich-text/Markdown rendering.
- Track outdated critical operational articles through review dates/owners.

## Tests / Evidence
- Published articles resolve; drafts/private items do not leak.
- Broken internal help links are checked automatically.
- Search returns relevant accessible results.

## Exit gate
Every production support topic/button either opens maintained help content or a real support workflow.