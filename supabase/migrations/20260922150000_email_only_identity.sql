-- WRS email-only registration: phone remains optional profile metadata.
alter table public.user_profiles
  alter column normalized_phone drop not null;

comment on column public.user_profiles.normalized_phone is
  'Optional phone number. WRS account verification is email-only.';
