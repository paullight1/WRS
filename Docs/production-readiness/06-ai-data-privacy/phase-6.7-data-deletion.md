# Phase 6.7 — Data and Biometric Deletion

## Goal
Make the Settings deletion promises operationally true.

## Implementation
- Enumerate original uploads, derived artifacts, indexes/embeddings/templates and dataset memberships affected by a deletion request.
- Authenticate/re-authenticate sensitive deletion requests.
- Revoke future processing/licensing immediately where required, then delete/anonymize eligible records and objects.
- Preserve only legally/operationally required audit evidence without retaining deleted content unnecessarily.
- Define asynchronous job status and failure/retry handling.

## Tests / Evidence
- Deleted media becomes inaccessible from user/API/storage paths.
- Derived eligible copies are removed or invalidated according to policy.
- A failed deletion job is visible/retriable rather than falsely reported successful.

## Exit gate
`Delete biometric data` triggers an auditable lifecycle that actually removes/revokes the specified user data.