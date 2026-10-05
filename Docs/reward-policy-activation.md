# WRS rewards policy

Implemented on 1 October 2026.

## Member experience

- XP measures reputation and progress; it cannot be spent or converted to RBC.
- RoboCoin (RBC) is the reward balance. Verified financial earnings stay separate.
- Mining power is a capability statistic, based on levels and contributions.
- Higher levels require XP and approved achievements. The default examples range from New Miner (1×) to Elite Miner (4×).
- Mining sessions last 24 hours. One robot slot is free; additional slots stay locked until a paid capacity feature is released.

## Reward settings

An admin or reward operator can open Operations → rewards to edit activity awards, daily limits, achievement requirements, and miner levels. Changes create an immutable draft version. Activating a version enables XP. RBC requires separate activation with a base mining rate, session limit, daily limit, total issuance limit and fixed precision. Monetary settings are not guessed.

Daily activity, completed profiles, account verification and approved training award XP only. Approved data, passed Academy assessments, validated contributions, verified community events, qualified referrals and missions may also award RBC. A verified source is required for every award. Referral signup alone does not qualify; the current qualification workflow requires account verification and a paid activation after its review window.

The policy examples prefill the editor. They are editable, and they do not automatically activate rewards. Validation, community and mission achievements require operator evidence. All setting changes require the appropriate operator permission and recent MFA.

## Deployment status

The new configurable_xp_rbc_reward_rules migration was applied to the database used by the development app. The previous one_free_robot_slot update was confirmed present. Earlier migrations do not need to be run again. There is no active reward rule yet and RBC issuance remains disabled. The currently shown member account has no reward operator role. Account selection and the 24-hour mining reward amount are awaiting the owner’s answer.

## Checks

The entire migration chain applied successfully to an isolated PostgreSQL 16 database. Queries confirmed once-only daily/profile/verification awards, exact RBC ledger entries, shared daily limits, achievement-gated levels, 24-hour mining duration, and the saved level multiplier. The app passed TypeScript checks and a production build. Focused lint checks passed for new reward code; the existing operations/mining screens have preexisting effect lint findings.

Old reward point history is retained. New point awards and point-based boosts are retired; no historical points are converted into XP or RBC. Activity receipts prevent old verified awards from being paid a second time. Global and daily RBC limits include both mining and contribution awards.
