# Task 4 — RBC wallet, conversion quote, and withdrawal request UI

## Scope delivered

- Added the dedicated member wallet screen at `src/screens/mining/Wallet.jsx`.
- Added a conversion-quote panel at `src/components/mining/ConversionQuote.jsx`.
- Added a bank-withdrawal request form at `src/components/mining/WithdrawalForm.jsx`.
- Extended `src/lib/miningApi.js` with the approved RBC wallet endpoints:
  - wallet and conversion-rate reads;
  - conversion-quote creation;
  - withdrawal creation;
  - withdrawal and transaction history reads.
- Added focused behavior coverage in `scripts/rbc-wallet.test.js`.

## Safety behavior

- The UI uses integer minor-unit RBC values in API payloads.
- A user must provide bank country, bank name, account holder, account number/IBAN, amount, destination currency, and an explicit confirmation before submitting.
- Client-side validation rejects zero/invalid amounts and amounts above the server-returned available RBC balance.
- Displayed bank accounts are masked to the final four characters only.
- The balance, history, and request status remain available if no conversion rate has been published yet; only conversion is unavailable.
- The withdrawal state copy is intentionally distinct:
  - `pending` means submitted for review, not paid;
  - `approved` means eligible for manual processing, not paid;
  - only a server-returned `paid` state says an administrator recorded a completed bank payout.
- No send, receive, or transfer controls or client API methods were added.

## TDD evidence

1. Created `scripts/rbc-wallet.test.js` before wallet implementation.
2. Ran `node --test scripts/rbc-wallet.test.js`; it failed because the wallet API exports were missing.
3. Implemented the smallest shared wallet helpers and endpoint wrappers, then added the UI components that consume them.
4. Corrected a hand-calculation error in the quote fixture (minor-unit formatting) and reran the focused suite.

## Verification

- `node --test scripts/rbc-wallet.test.js` — 9 passing, 0 failing.
- `npm run check` — passed: 45 project tests plus the production build.
- Browser route check at `/mining/wallet` — desktop mining rail and mobile five-item navigation include RBC Wallet; no console errors.

## Integration note

The task initially ran before the parallel RBC API changes were available. A boundary review after the API landed found and corrected three contract details: quotes use `currency`, withdrawals are bound to a server-created `quoteId`, and quote results use `destinationAmountMinor`/`feeRbcCents`. The UI remains deliberately free of fabricated balances, quotes, or payout success states.
