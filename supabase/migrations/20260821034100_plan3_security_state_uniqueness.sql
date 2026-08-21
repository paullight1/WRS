-- Plan 3 concurrency invariants for live verification and MFA state.

create unique index if not exists verification_requests_one_live_idx
  on public.verification_requests(user_id, kind)
  where consumed_at is null and superseded_at is null;

create unique index if not exists user_mfa_factors_one_active_idx
  on public.user_mfa_factors(user_id)
  where status in ('pending', 'verified');

comment on index public.verification_requests_one_live_idx is
  'At most one open verification challenge may exist per user and factor.';
comment on index public.user_mfa_factors_one_active_idx is
  'At most one pending or verified MFA factor may exist per user.';
