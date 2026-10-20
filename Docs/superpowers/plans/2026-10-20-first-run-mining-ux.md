# First-Run and Mining UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make required first-run guidance, robot setup, and mining completion understandable to new WRS users while preserving server-owned mining rules.

**Architecture:** Keep the UX changes in the existing React screens and components. Make the welcome dialog an explicit acknowledgment gate above app navigation, simplify the robot's default presentation without deleting advanced functions, and update Home's settlement and amount copy while retaining existing routes and API behavior.

**Tech Stack:** React 18, React Router 7, Vite, Tailwind CSS, existing WRS UI components.

**Spec:** `Docs/superpowers/specs/2026-10-20-first-run-mining-ux-design.md`

## Global Constraints

- Preserve existing server-authoritative mining settlement, configured rate, cycle duration, eligibility, and ledger accounting.
- “Continue mining” opens the existing mining screen; it does not start a cycle automatically.
- The welcome guide is acknowledged before Home; after acknowledgment users may enter Home without a robot.
- Keep passport, customization, capabilities, and service actions available.
- Do not add or run the automated test suite unless requested.

## Review Focus

- Very short mobile viewport and safe-area insets: welcome content scrolls and the primary acknowledgment control remains reachable above the bottom navigation. Verify in Task 1 at 430×932 and a shorter mobile height.
- Keyboard and assistive navigation: the guide traps focus, backdrop click and Escape cannot dismiss it, and acknowledgment restores focus. Verify in Task 1 using keyboard interaction and accessibility inspection.
- Account-local onboarding state: acknowledgment marks only the signed-in account as seen. Verify Task 1 by switching between two local test accounts or clearing the account-specific flag.
- Missing or partial robot configuration: the friendly robot view handles unavailable values without rendering raw IDs as primary content. Verify Task 2 with the loading, configured, and no-configuration states available in the app.
- Mining values at zero, high precision, loading, and unavailable states: the amount stays accurately formatted without `/24h`, and the CTA never starts a cycle by itself. Verify Task 3 against configured, loading, and unavailable UI states.

---

### Task 1: Required first-run guide and clear setup next step

**Files:**
- Modify: `src/components/WelcomeModal.jsx`
- Modify: `src/components/robot/RobotSetupPanel.jsx`
- Inspect: `src/components/AppShell.jsx` stacking tokens and mobile bottom navigation

**Interfaces:**
- Consumes: `WelcomeModal({ open, onClose, robotName })`; existing `hasSeenOnboarding(userId)` and `markOnboardingSeen(userId)` helpers.
- Produces: a non-dismissible-until-acknowledged welcome guide; the existing `onClose` callback runs only after explicit acknowledgment or navigation that is already an approved onward action (none in the selected design).

- [x] **Step 1: Update the welcome dialog behavior and copy**

  In `WelcomeModal.jsx`, remove the backdrop's close action and do not close on Escape. Remove the “Look around first” bypass and direct links that let a user bypass acknowledgment. Use concise setup-focused copy and one primary “Continue to Home” acknowledgment action that calls `onClose`.

- [x] **Step 2: Fix dialog stacking and mobile layout**

  Ensure the modal overlay and panel stack above `z-nav`; preserve body scroll lock and focus containment/restoration. Give the panel a safe-area-aware maximum height with internal vertical scrolling, and keep its action reachable on short mobile screens.

- [x] **Step 3: Make the no-robot Home card the clear next step**

  In `RobotSetupPanel.jsx`, replace “robot account and configuration” phrasing with grade-five language that says the robot is not set up yet and directs the user to the simple setup action. Keep existing unavailable, error/retry, and saved-draft states working.

- [x] **Step 4: Review the flow at mobile and desktop sizes**

  Open Home as a first-visit account at 430×932, then at a shorter mobile height and desktop width. Confirm the modal covers the navigation, scrolls when needed, cannot close via backdrop/Escape, and “Continue to Home” exposes the Home setup card for users without a robot. Confirm a returning account does not see it again.

- [x] **Step 5: Commit the first-run changes**

  ```bash
  git add src/components/WelcomeModal.jsx src/components/robot/RobotSetupPanel.jsx
  git commit -m "feat(onboarding): require welcome acknowledgement"
  ```

### Task 2: Simplify the robot page for new users

**Files:**
- Modify: `src/screens/MyRobot.jsx`

**Interfaces:**
- Consumes: existing `useRobot()` state, robot package definition, capability functions, and existing page actions.
- Produces: a user-facing Overview and plain-language Configuration presentation, while retaining capabilities, services, passport, and customization access.

- [x] **Step 1: Simplify the Overview tab**

  Remove internal owner and robot IDs from the primary view. Lead with the robot name and image, summarize what it can do in familiar language, and keep Customize Robot and Passport actions available.

- [x] **Step 2: Simplify the Configuration tab**

  Rename the visible tab and headings to everyday terms, translating internal configuration labels (personality, voice profile, processing speed, battery optimization, sensor sensitivity) into short user-facing labels. Put version/timestamp and raw technical details behind an explicitly labeled optional “Technical details” disclosure. Keep the authoritative data read-only.

- [x] **Step 3: Review configured and incomplete states**

  Inspect a configured robot and a robot with unavailable configuration. Confirm the default screen has no required backend terminology, optional details remain reachable, and existing tab actions still work.

- [x] **Step 4: Commit the robot page changes**

  ```bash
  git add src/screens/MyRobot.jsx
  git commit -m "feat(robot): simplify robot details"
  ```

### Task 3: Clarify mining completion and amount on Home

**Files:**
- Modify: `src/screens/Home.jsx`

**Interfaces:**
- Consumes: existing authoritative `miningSnapshot`, settlement report, and `/deploy` route.
- Produces: beginner-friendly settled-cycle summary, explicit “Continue mining” navigation, and a clear cycle amount with no `/24h` suffix.

- [x] **Step 1: Simplify the settled-cycle report**

  Replace the operational explanation and duration card with a concise completion message and the settled RBC amount. Label the award in plain language (for example, “You earned +1.2 RBC”). Change the CTA to “Continue mining” and retain its `/deploy` destination.

- [x] **Step 2: Display the cycle amount without the rate suffix**

  Update `formatDailyMiningRate` and its label so Home shows the calculated 24-hour cycle amount as an RBC value only (for example, `1.2 RBC`), never `RBC / 24h`. Preserve exact atomic conversion, current configured inputs, loading feedback, and an explicit unavailable state.

- [x] **Step 3: Review mining behavior and responsive display**

  Inspect Home with a settled session, a running session, a loading snapshot, and an unavailable rate. Confirm settled copy is short, the button routes to `/deploy`, no new cycle is created from Home, running-cycle countdown remains intact, and the amount contains no `/24h` suffix at mobile and desktop widths.

- [x] **Step 4: Commit the Home mining changes**

  ```bash
  git add src/screens/Home.jsx
  git commit -m "feat(home): clarify mining cycle rewards"
  ```

### Final verification

- [x] Run `npm run build` and confirm Vite completes successfully.
- [x] Run ESLint on `src/components/WelcomeModal.jsx`, `src/components/robot/RobotSetupPanel.jsx`, `src/screens/MyRobot.jsx`, and `src/screens/Home.jsx`.
- [x] Check `git diff --check` and confirm only the intended files changed.
