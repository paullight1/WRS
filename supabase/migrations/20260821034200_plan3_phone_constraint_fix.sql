-- Correct the E.164 normalized-phone constraint without relying on
-- backslash-sensitive regular-expression escaping.
alter table public.user_profiles
  drop constraint if exists user_profiles_normalized_phone_check;

alter table public.user_profiles
  add constraint user_profiles_normalized_phone_check check (
    char_length(normalized_phone) between 9 and 16
    and left(normalized_phone, 1) = '+'
    and substring(normalized_phone from 2 for 1) between '1' and '9'
    and substring(normalized_phone from 2) !~ '[^0-9]'
  );

comment on constraint user_profiles_normalized_phone_check on public.user_profiles is
  'Normalized phone numbers must be E.164-like: leading +, non-zero country prefix, digits only, 8-15 digits.';
