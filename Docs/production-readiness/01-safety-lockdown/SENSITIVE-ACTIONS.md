# WRS Sensitive Action Inventory

This is the human-auditable mirror of `src/lib/sensitiveActions.js`. It exists so production review can verify that every money, identity, reward, deployment, biometric/data and support action has an explicit risk owner and disposition.

**Rule:** demo behavior may only simulate actions that are visibly labeled as demo. Staging/production fail closed unless the required authoritative service is configured **and** the individual WRS action has completed its implementation gate.

| Action ID | Surface | Risk | Plan 1 disposition | Authoritative dependency |
|---|---|---:|---|---|
| `payment.checkout` | Checkout | P0 | demo-label | Payments + ledger |
| `payment.success` | Payment success route | P0 | disable | Verified transaction lookup |
| `wallet.deposit` | Wallet | P0 | disable | Payments + ledger |
| `wallet.withdraw` | Wallet | P0 | disable | KYC + payouts + ledger |
| `reward.eventCode` | Event codes | P0 | demo-label | Server reward/event-code service |
| `reward.boost` | Robot boosts | P1 | demo-label | Reward ledger + entitlement service |
| `training.biometricSubmit` | Voice/face/movement training | P0 | disable | Consent + secure capture/storage |
| `training.fileUpload` | Skill/custom training | P1 | disable | Signed upload + scan + private storage |
| `data.taskSubmit` | Data tasks | P1 | demo-label | Data submission/review service |
| `deployment.request` | Deployment detail | P0 | demo-label | Eligibility + contract service |
| `deployment.pause` | Active deployment | P1 | disable | Deployment state machine |
| `marketplace.purchase` | Marketplace | P1 | demo-label | Catalogue + payments + entitlements |
| `account.deleteData` | Settings/privacy | P0 | disable | Data inventory + deletion/audit service |
| `account.deleteAccount` | Settings/account | P0 | disable | Identity + retention/deletion workflow |
| `support.ticket` | Support | P1 | demo-label | Support case system |

## Required production behavior

1. Direct navigation can never fabricate a successful transaction, deployment, reward, upload, deletion or ticket.
2. Production and staging hide sensitive mock balances, payouts, contracts, biometric records and operational history when the authoritative service is unavailable.
3. Client-side state cannot be the source of truth for money, entitlements, XP/rewards, contracts, consent or identity.
4. All live effects require server-side authorization, idempotency where relevant, and durable audit evidence.
5. A feature stays disabled even if an environment flag is accidentally enabled until its action registry entry has `implemented: true` after the later plan's verification gate.
