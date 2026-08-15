# WRS Support Track Implementation Plan

> **For agentic workers:** Implement only this track. Keep support API/data/UI changes isolated; report shared route wiring instead of editing `server/app.js` if it would overlap another track.

**Goal:** Replace the support screen's no-op content with authored help data and server-persisted authenticated tickets.

**Architecture:** Add a focused server support module with catalog, ticket creation, listing, detail, and reply operations. The React screen consumes the API, supports topic/article selection, ticket creation, and a user's ticket list/detail. Live chat remains explicitly unavailable.

**Tech Stack:** React, existing UI primitives, Node HTTP API, JSON/Postgres store abstraction, Node test runner.

## Global Constraints

- Do not claim live chat availability without a chat provider.
- Tickets are scoped to the authenticated user; admin-only access is not part of this track.
- Mutations validate subject/message length and use authenticated ownership.
- Keep server route registration as a small integration change for the main agent if necessary.

## File Map

- Create: `server/support.js` — support catalog and ticket state transitions.
- Modify: `src/screens/Support.jsx` — data-driven topic/article/ticket UI.
- Modify: `src/lib/api.js` or create `src/lib/supportApi.js` — support API client.
- Test: `server/tests/support.test.js` — API and ownership coverage.

### Task 1: Server support module and tests

- [ ] Add catalog records for Packages, Wallet, Deployment, Data tasks, Robot training, Report fraud, and Technical problem. Each record must contain `slug`, `title`, `summary`, `icon`, and at least three FAQ articles with `slug`, `question`, and answer text.
- [ ] Add `ensureSupportCollections(db)` for `supportTickets` and `supportTicketMessages`.
- [ ] Implement `listSupportTopics(db)`, `getSupportTopic(db, slug)`, `createSupportTicket(db, userId, input, timestamp, idempotencyKey)`, `listSupportTickets(db, userId)`, and `getSupportTicket(db, userId, ticketId)`.
- [ ] Validate subject 3–160 chars, message 10–5000 chars, and known topic slug. Store `status: 'open'`, `createdAt`, `updatedAt`, and initial message author.
- [ ] Add tests for topic data, successful ticket creation, invalid input, idempotent replay, user ownership, and missing ticket.

### Task 2: Support client and UI

- [ ] Add `supportApi` methods for topics, topic detail, create ticket, list tickets, and ticket detail.
- [ ] Replace no-op topic/article rows with loading/error/data states, search, detail view, and ticket list/detail.
- [ ] Keep the live chat card labelled `Unavailable` and explain the provider dependency on activation.
- [ ] Submit the ticket with an idempotency key, show server-confirmed status, and clear the form only after success.

### Task 3: Verification

- [ ] Run `node --test server/tests/support.test.js`.
- [ ] Run the frontend build and `git diff --check` for the track.

