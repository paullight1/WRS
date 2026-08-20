# Phase 3.6 — OAuth Providers

## Goal
Make social-login controls genuine and secure, or remove them until they are.

## Implementation
- Integrate only approved providers, beginning with Google and Apple if required by product scope.
- Validate OAuth state/nonce/PKCE and provider claims server-side.
- Define safe account-linking rules for existing email/phone users.
- Handle provider cancellation, missing email, revoked consent and duplicate identities.
- Hide unsupported provider buttons in production.

## Tests / Evidence
- OAuth callback rejects invalid state/nonce and forged provider data.
- Existing-account linking cannot be used for account takeover.
- New and returning social-login flows both reach the correct account.

## Exit gate
Every visible production social-login button completes a real verified provider flow with safe account linking.