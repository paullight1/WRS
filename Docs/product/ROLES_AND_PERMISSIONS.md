# Roles and permissions

WRS uses additive, scoped roles. A person may be a member, contributor, validator, and
ambassador at the same time, but each credential is granted and revoked independently.

## Principles

- deny by default and grant the minimum scope needed;
- separate account role, qualification, geographic scope, project scope, and temporary
  permission;
- buying a package changes entitlements, not authority;
- high-risk actions require separation of duties or two-person approval;
- every grant, use, escalation, suspension, and revocation is audited;
- a dashboard must not fetch data that its user is not allowed to see.

## Permission matrix

| Action | Member | Contributor | Validator | Ambassador/leader | Staff admin | Release approver |
| --- | --- | --- | --- | --- | --- | --- |
| Manage own profile/consent | own | own | own | own | support-scoped | own |
| Accept and submit data task | eligible | eligible | eligible, but not self-review | eligible | test/admin only | eligible |
| Review submission | no | no | assigned level/scope | no, unless separately credentialed | assigned | assigned |
| View contributor identity | own | own | hidden/minimum necessary | aggregate only | need-to-know | minimum necessary |
| Create event code | no | no | no | authorized event scope | yes | no |
| See community metrics | personal | personal | personal | aggregate assigned scope | yes | no |
| Grant leadership/validator role | no | no | no | nominate only | authorized staff | no |
| Release dataset | no | no | recommend within scope | no | operational checks | explicit versioned approval |
| Post wallet/reward correction | no | no | no | no | dual-controlled finance role | no |
| Export sensitive data | own rights export | own rights export | no | no | exceptional approved scope | controlled manifest only |

## Role state

`Applied → Active → Suspended → Revoked/Expired`

A role grant records role type, subject, scope, permitted actions, issuer, reason,
training/credential evidence, start/end, review date, status, and revocation reason.
Suspension immediately removes active permissions while preserving the audit history.

## Administrative separation

Avoid a universal administrator. Use distinct support, moderation, community operations,
validator operations, finance operations, privacy operations, enterprise operations,
security, and release-approval roles. Break-glass access is time-limited, justified,
alerted, and reviewed.

