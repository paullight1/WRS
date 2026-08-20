# Phase 8.10 — Referral Qualification Engine

## Goal
Replace static referral history/rewards with an abuse-resistant qualification lifecycle.

## Implementation
- Create invitation/referral records tied to inviter and referred account without exposing sensitive identity.
- Define qualification steps: signup, verification, eligible activation/activity, review window and qualified/rejected state.
- Detect/block self-referral and duplicate/linked-account abuse using documented risk signals.
- Award referral benefits only through the rewards/ledger systems after qualification.
- Support reversals if the qualifying transaction is refunded/fraudulent according to policy.

## Tests / Evidence
- Self-referral, duplicate account and repeated qualification attempts fail.
- Reward is not granted before the review/qualification rule is satisfied.
- Same referred user cannot qualify multiple inviters unless product rules explicitly allow it.

## Exit gate
Every referral reward can be traced to one legitimate qualified referral and cannot be created from a copied client-side code alone.