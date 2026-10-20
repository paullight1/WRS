# First-Run and Mining UX Design

## Goal

Make the first signed-in experience understandable to a new WRS user, simplify the robot page, and make the end of a 24-hour mining cycle clear without changing mining eligibility or reward rules.

## Approved behavior

- The first-run welcome guide is required: users cannot dismiss it with the backdrop, Escape, or a “look around first” bypass. It must render above the fixed bottom navigation and keep its actions visible on small screens.
- The user must acknowledge the guide before entering Home. A user who has not created a robot may continue into Home; Home must make robot setup an obvious next step.
- Robot information should use familiar labels and a short overview by default. Technical configuration values remain available in a clearly optional details area rather than dominating the primary robot experience.
- When a mining cycle settles, the Home summary should use short, beginner-friendly language, emphasize the amount of RoboCoin awarded, and offer “Continue mining.” This action navigates to Mining so the user explicitly starts another cycle; it does not auto-start or auto-repeat a cycle.
- The home mining amount should display the RoboCoin value without the “/24h” suffix. Do not change the configured rate, cycle duration, or ledger accounting.

## Existing flow and constraints

- `WelcomeModal` is shown from Home for users without a per-account local-storage “seen” flag. It currently closes on backdrop, Escape, navigation links, and “Look around first.”
- The Home settled report currently explains a 24-hour duration and asks users to return and start again. Its action links to `/deploy` and says “Return to Mining.”
- Home formats the displayed mining amount in `formatDailyMiningRate`.
- `/robot` renders `MyRobot`, whose default Overview exposes internal identity fields and whose Configuration tab displays raw configuration labels and records.
- Mining cycles are server-authoritative. The approved “Continue mining” action must preserve existing server-side checks and user initiation.

## User experience details

### Required welcome guide

Use a clear heading such as “Let’s set up your robot,” explain in one or two short sentences what the guide is for, and present a primary acknowledgment action. The modal remains accessible with focus containment and restoration. Backdrop and Escape do not dismiss it. Size the panel against the viewport and safe areas, allow its content to scroll, and ensure the panel/CTA sits above bottom navigation. After acknowledgment, mark the per-account guide as seen and allow Home; existing no-robot Home content provides the setup CTA.

### Robot summary

Keep the 3D robot and name prominent. Replace internal IDs, “authoritative identity,” and service-boundary wording in the default experience with user-facing facts and next actions. Keep configuration/capability/service details reachable on demand, but use plain terms and avoid presenting internal IDs as routine setup information. Do not remove passport, customization, or service functionality.

### Mining completion and amount

Use a concise message such as “Your last mining cycle is complete” and “You earned +1.2 RBC.” Remove duration and operational instructions that repeat cycle mechanics. Rename the action “Continue mining,” retaining its existing destination and server gating. Present the home amount as a value such as “1.2 RBC,” without a rate suffix. Distinguish unavailable/loading values from zero and preserve current precision appropriate to the configured atomic scale.

## Acceptance criteria

1. A first-time user cannot dismiss the guide by clicking outside or pressing Escape; the only way forward is the explicit acknowledgment action.
2. The guide, controls, and acknowledgment action remain visible or reachable by scrolling on a narrow mobile viewport, and the fixed bottom bar does not cover them.
3. Acknowledgment opens Home and records that the guide was seen for that account; users without a robot see a clear setup next step.
4. The default robot experience is understandable without interpreting database IDs or backend terms; advanced information and existing actions remain available.
5. After settlement, Home shows the amount awarded in plain language and a “Continue mining” action that routes to the existing Mining screen without creating a new cycle automatically.
6. The Home mining amount contains no “/24h” suffix; loading and missing configuration states remain clear.
7. Existing mining balances, settlement behavior, eligibility, and authentication are unchanged.

## Implementation and verification scope

Expected primary files: `src/components/WelcomeModal.jsx`, `src/screens/Home.jsx`, and `src/screens/MyRobot.jsx`; inspect shared dialog and bottom-navigation stacking styles before changing z-index or layout. Keep changes focused and preserve server-owned mining behavior. Verify the production build, lint the touched UI files, and inspect the welcome and Home/robot states at mobile and desktop widths. Do not add or run the automated test suite unless requested.
