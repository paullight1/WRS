# Integrated member dashboard and Wallet design

## Result

- Home and RoboCoin Wallet are separate routes with the shared navy/violet member shell and Home/Mine/Train/Wallet/More navigation.
- Home shows wallet balances, exact XP/RBC amounts, wallet actions, collapsible daily mining records, and a live cycle progress bar visible while collapsed.
- The balance hero offers Start mining when eligible; active mining status/countdown/link are removed from that hero.
- The flat More section replaces Shortcuts, has no edit control, and precedes Recent Transactions. Wallet, Add data, Passport and Customise entries are removed from its catalogue and older saved lists.
- Recent Transactions combines confirmed XP/RBC awards and cash activity, with exact atomic amounts and a dated recent-history dialog. The Deposit dialog has no package promotion.
- Profile has no outer form card or account-identity subtitle. Its searchable country picker matches the other fields and saves ISO country codes through the existing account API.
- Active mining cards use dark worksite headers with readable, wrapping task descriptions.

## Data and access

- Daily progress reads only the signed-in member's existing mining sessions, splits time at UTC midnight and caps elapsed time at cycle end. No database schema migration is needed.
- Home refreshes on focus and every visible minute. Successful daily XP claims are cached by user/day, failed claims can retry, and stalled claims do not block balances or mining controls.
- Mining start uses authoritative eligibility, request locking and stable retry idempotency keys.
- RoboCoin Wallet uses verified-session access. Cash controls remain gated by verified KYC; existing payout and withdrawal authorization is preserved.

## Validation

- 60 unit/integration files, 320 tests passed.
- 257 API contract checks passed, including both gateway manifests and nonblocking daily reward refresh behavior.
- Lint, typecheck, production build, bundle limits and secret scan passed.
- Browser checks covered separate routes, mobile/desktop layouts, country search, daily progress, history and the flat More section. The browser connection closed during the final mining-card visual check.
- Local development remains on paul/restored-dark-workspace. User explicitly authorized pushing the accumulated changes to GitHub main. Local environment and Supabase temporary files remain excluded.
