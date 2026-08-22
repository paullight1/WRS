-- WRS Plan 5: authoritative double-entry finance ledger, payment settlement,
-- ledger-derived wallet balances, withdrawals and reconciliation evidence.

create table if not exists public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.user_profiles(user_id) on delete restrict,
  code text not null unique,
  account_kind text not null check (account_kind in ('asset','liability','equity','revenue','expense')),
  normal_side text not null check (normal_side in ('debit','credit')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (status in ('active','frozen','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(user_id) on delete restrict,
  kind text not null,
  status text not null default 'pending' check (status in ('pending','posted','reversed','failed')),
  reference text not null unique,
  idempotency_key text not null unique,
  provider text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  unique(provider, provider_reference)
);

create table if not exists public.ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.ledger_transactions(id) on delete restrict,
  account_id uuid not null references public.ledger_accounts(id) on delete restrict,
  direction text not null check (direction in ('debit','credit')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);
create index if not exists ledger_entries_account_time_idx on public.ledger_entries(account_id, created_at, id);

create table if not exists public.package_prices (
  package_slug text not null check (package_slug in ('starter','builder','professional','enterprise','elite','visionary')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (package_slug, currency)
);

insert into public.package_prices(package_slug, currency, amount_minor) values
  ('starter','USD',2000),
  ('builder','USD',5000),
  ('professional','USD',10000),
  ('enterprise','USD',20000),
  ('elite','USD',50000),
  ('visionary','USD',100000)
on conflict (package_slug, currency) do update
  set amount_minor = excluded.amount_minor,
      active = true,
      updated_at = now();

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  package_slug text not null check (package_slug in ('starter','builder','professional','enterprise','elite','visionary')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  provider text not null default 'paystack',
  provider_reference text,
  access_code text,
  status text not null default 'initialized' check (status in ('initialized','pending','succeeded','failed','refunded','reversed')),
  idempotency_key text not null unique,
  settlement_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_reference)
);

create table if not exists public.financial_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_fingerprint text not null,
  provider_reference text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, event_fingerprint)
);

create table if not exists public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  provider text not null default 'paystack',
  recipient_code text not null,
  masked_account text not null,
  bank_code text not null,
  account_name text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'verified' check (status in ('verified','revoked')),
  created_at timestamptz not null default now(),
  unique(provider, recipient_code)
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  payout_method_id uuid not null references public.payout_methods(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reference text not null unique,
  provider text not null default 'paystack',
  provider_reference text,
  status text not null default 'reserved' check (status in ('reserved','provider_pending','succeeded','failed','reversed')),
  idempotency_key text not null unique,
  reservation_transaction_id uuid not null unique references public.ledger_transactions(id) on delete restrict,
  settlement_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  failure_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_reference)
);

create table if not exists public.financial_reconciliations (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('payment','withdrawal')),
  resource_id uuid not null,
  provider text not null,
  provider_reference text not null,
  local_status text not null,
  provider_status text not null,
  matched boolean not null,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

alter table public.ledger_accounts enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.package_prices enable row level security;
alter table public.payment_intents enable row level security;
alter table public.financial_provider_events enable row level security;
alter table public.payout_methods enable row level security;
alter table public.withdrawals enable row level security;
alter table public.financial_reconciliations enable row level security;

revoke all on public.ledger_accounts, public.ledger_transactions, public.ledger_entries,
  public.payment_intents, public.financial_provider_events, public.payout_methods,
  public.withdrawals, public.financial_reconciliations from anon, authenticated;
revoke insert, update, delete on public.package_prices from anon, authenticated;
grant select on public.package_prices to authenticated;

create or replace function public.wrs_finance_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'financial ledger rows are append-only';
end;
$$;

drop trigger if exists ledger_entries_append_only on public.ledger_entries;
create trigger ledger_entries_append_only
before update or delete on public.ledger_entries
for each row execute function public.wrs_finance_append_only();

drop trigger if exists ledger_transactions_no_delete on public.ledger_transactions;
create trigger ledger_transactions_no_delete
before delete on public.ledger_transactions
for each row execute function public.wrs_finance_append_only();

create or replace function public.wrs_ensure_finance_account(
  p_owner_user_id uuid,
  p_code text,
  p_kind text,
  p_normal_side text,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_currency !~ '^[A-Z]{3}$' then raise exception 'invalid currency'; end if;
  insert into public.ledger_accounts(owner_user_id, code, account_kind, normal_side, currency)
  values (p_owner_user_id, p_code, p_kind, p_normal_side, p_currency)
  on conflict (code) do update set code = excluded.code
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.wrs_post_ledger_transaction(
  p_user_id uuid,
  p_kind text,
  p_reference text,
  p_idempotency_key text,
  p_provider text,
  p_provider_reference text,
  p_entries jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing uuid;
  v_transaction uuid;
  v_currency text;
  v_debit bigint := 0;
  v_credit bigint := 0;
  v_entry jsonb;
  v_account uuid;
  v_amount bigint;
  v_direction text;
begin
  select id into v_existing from public.ledger_transactions where idempotency_key = p_idempotency_key;
  if v_existing is not null then return v_existing; end if;

  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) < 2 then
    raise exception 'journal requires at least two entries';
  end if;

  for v_entry in select value from jsonb_array_elements(p_entries) loop
    v_amount := (v_entry->>'amountMinor')::bigint;
    v_direction := v_entry->>'direction';
    if v_amount <= 0 or v_direction not in ('debit','credit') then raise exception 'invalid ledger entry'; end if;
    if v_currency is null then v_currency := upper(v_entry->>'currency'); end if;
    if upper(v_entry->>'currency') <> v_currency then raise exception 'mixed-currency journal'; end if;
    if v_direction = 'debit' then v_debit := v_debit + v_amount; else v_credit := v_credit + v_amount; end if;
  end loop;

  if v_debit = 0 or v_debit <> v_credit then raise exception 'debit and credit totals must balance'; end if;

  insert into public.ledger_transactions(
    user_id, kind, status, reference, idempotency_key, provider, provider_reference, metadata, posted_at
  ) values (
    p_user_id, p_kind, 'posted', p_reference, p_idempotency_key, p_provider, p_provider_reference,
    coalesce(p_metadata, '{}'::jsonb), now()
  ) returning id into v_transaction;

  for v_entry in select value from jsonb_array_elements(p_entries) loop
    select id into v_account from public.ledger_accounts
      where code = v_entry->>'accountCode' and currency = upper(v_entry->>'currency') and status = 'active';
    if v_account is null then raise exception 'unknown ledger account: %', v_entry->>'accountCode'; end if;
    insert into public.ledger_entries(transaction_id, account_id, direction, amount_minor, currency)
    values (v_transaction, v_account, v_entry->>'direction', (v_entry->>'amountMinor')::bigint, upper(v_entry->>'currency'));
  end loop;

  return v_transaction;
end;
$$;

create or replace function public.wrs_create_payment_intent(
  p_user_id uuid,
  p_package_slug text,
  p_currency text,
  p_provider text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price public.package_prices%rowtype;
  v_intent public.payment_intents%rowtype;
  v_email text;
begin
  select * into v_intent from public.payment_intents where idempotency_key = p_idempotency_key;
  if v_intent.id is not null then
    select normalized_email into v_email from public.user_profiles where user_id = p_user_id;
    return jsonb_build_object('intentId',v_intent.id,'reference','wrs-pay-' || v_intent.id,'amountMinor',v_intent.amount_minor,'currency',v_intent.currency,'email',v_email);
  end if;

  select * into v_price from public.package_prices
  where package_slug = p_package_slug and currency = upper(p_currency) and active = true;
  if v_price.package_slug is null then raise exception 'active package price not found'; end if;
  select normalized_email into v_email from public.user_profiles where user_id = p_user_id;
  if v_email is null then raise exception 'user profile not found'; end if;

  insert into public.payment_intents(user_id, package_slug, amount_minor, currency, provider, idempotency_key)
  values (p_user_id, p_package_slug, v_price.amount_minor, v_price.currency, p_provider, p_idempotency_key)
  returning * into v_intent;

  return jsonb_build_object('intentId',v_intent.id,'reference','wrs-pay-' || v_intent.id,'amountMinor',v_intent.amount_minor,'currency',v_intent.currency,'email',v_email);
end;
$$;

create or replace function public.wrs_attach_payment_provider_reference(
  p_user_id uuid,
  p_intent_id uuid,
  p_provider_reference text,
  p_access_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payment_intents
  set provider_reference = p_provider_reference, access_code = p_access_code, status = 'pending', updated_at = now()
  where id = p_intent_id and user_id = p_user_id and status in ('initialized','pending');
  if not found then raise exception 'payment intent not found'; end if;
end;
$$;

create or replace function public.wrs_settle_payment(
  p_user_id uuid,
  p_provider text,
  p_provider_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_provider_status text,
  p_event_fingerprint text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.payment_intents%rowtype;
  v_transaction uuid;
  v_cash_code text;
  v_revenue_code text;
begin
  insert into public.financial_provider_events(provider,event_fingerprint,provider_reference,event_type,payload)
  values (p_provider,p_event_fingerprint,p_provider_reference,'payment.verification',coalesce(p_payload,'{}'::jsonb))
  on conflict (provider,event_fingerprint) do nothing;

  select * into v_intent from public.payment_intents
  where provider = p_provider and provider_reference = p_provider_reference
  for update;
  if v_intent.id is null then raise exception 'payment intent not found'; end if;
  if p_user_id is not null and v_intent.user_id <> p_user_id then raise exception 'payment ownership mismatch'; end if;

  if v_intent.status = 'succeeded' then
    return jsonb_build_object('status','succeeded','intentId',v_intent.id,'transactionId',v_intent.settlement_transaction_id);
  end if;
  if lower(p_provider_status) <> 'success' then
    update public.payment_intents set status = 'pending', updated_at = now() where id = v_intent.id;
    return jsonb_build_object('status','pending','intentId',v_intent.id);
  end if;
  if p_amount_minor <> v_intent.amount_minor or upper(p_currency) <> v_intent.currency then
    update public.payment_intents set status = 'failed', updated_at = now() where id = v_intent.id;
    raise exception 'provider amount or currency mismatch';
  end if;

  v_cash_code := 'asset:paystack:' || v_intent.currency;
  v_revenue_code := 'revenue:packages:' || v_intent.currency;
  perform public.wrs_ensure_finance_account(null,v_cash_code,'asset','debit',v_intent.currency);
  perform public.wrs_ensure_finance_account(null,v_revenue_code,'revenue','credit',v_intent.currency);

  v_transaction := public.wrs_post_ledger_transaction(
    v_intent.user_id,
    'package-payment',
    'payment:' || v_intent.id,
    'payment-settle:' || v_intent.id,
    p_provider,
    p_provider_reference,
    jsonb_build_array(
      jsonb_build_object('accountCode',v_cash_code,'direction','debit','amountMinor',v_intent.amount_minor,'currency',v_intent.currency),
      jsonb_build_object('accountCode',v_revenue_code,'direction','credit','amountMinor',v_intent.amount_minor,'currency',v_intent.currency)
    ),
    jsonb_build_object('paymentIntentId',v_intent.id,'packageSlug',v_intent.package_slug)
  );

  update public.payment_intents
  set status = 'succeeded', settlement_transaction_id = v_transaction, updated_at = now()
  where id = v_intent.id;

  update public.package_entitlements
  set status = 'revoked', updated_at = now()
  where user_id = v_intent.user_id and status = 'active';

  insert into public.package_entitlements(user_id,package_slug,status,source,source_reference,activated_at)
  values (v_intent.user_id,v_intent.package_slug,'active','payment',p_provider_reference,now())
  on conflict (source,source_reference) where source_reference is not null do nothing;

  update public.financial_provider_events
  set processed_at = now()
  where provider = p_provider and event_fingerprint = p_event_fingerprint;

  return jsonb_build_object('status','succeeded','intentId',v_intent.id,'transactionId',v_transaction);
end;
$$;

create or replace function public.wrs_wallet_snapshot(p_user_id uuid, p_currency text default 'USD')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_currency text := upper(p_currency);
  v_code text := 'liability:wallet:' || p_user_id || ':' || upper(p_currency);
  v_account uuid;
  v_available bigint := 0;
  v_pending bigint := 0;
begin
  v_account := public.wrs_ensure_finance_account(p_user_id,v_code,'liability','credit',v_currency);
  select coalesce(sum(case when direction = 'credit' then amount_minor else -amount_minor end),0)
    into v_available from public.ledger_entries where account_id = v_account;
  select coalesce(sum(amount_minor),0) into v_pending
    from public.withdrawals where user_id = p_user_id and currency = v_currency and status in ('reserved','provider_pending');
  return jsonb_build_object('currency',v_currency,'availableMinor',greatest(v_available,0),'pendingWithdrawalMinor',v_pending);
end;
$$;

create or replace function public.wrs_reserve_withdrawal(
  p_user_id uuid,
  p_payout_method_id uuid,
  p_amount_minor bigint,
  p_currency text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.withdrawals%rowtype;
  v_currency text := upper(p_currency);
  v_wallet_code text := 'liability:wallet:' || p_user_id || ':' || upper(p_currency);
  v_pending_code text := 'liability:withdrawals:' || upper(p_currency);
  v_wallet uuid;
  v_available bigint := 0;
  v_transaction uuid;
  v_withdrawal public.withdrawals%rowtype;
  v_kyc text;
begin
  if p_amount_minor <= 0 then raise exception 'withdrawal amount must be positive'; end if;
  perform 1 from public.user_profiles where user_id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;
  select kyc_status into v_kyc from public.user_profiles where user_id = p_user_id;
  if v_kyc <> 'verified' then raise exception 'KYC verification required'; end if;
  if not exists(select 1 from public.payout_methods where id = p_payout_method_id and user_id = p_user_id and status = 'verified' and currency = v_currency) then
    raise exception 'verified payout method required';
  end if;

  select * into v_existing from public.withdrawals where idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    return jsonb_build_object('withdrawalId',v_existing.id,'reference',v_existing.reference,'status',v_existing.status);
  end if;

  v_wallet := public.wrs_ensure_finance_account(p_user_id,v_wallet_code,'liability','credit',v_currency);
  perform public.wrs_ensure_finance_account(null,v_pending_code,'liability','credit',v_currency);
  select coalesce(sum(case when direction = 'credit' then amount_minor else -amount_minor end),0)
    into v_available from public.ledger_entries where account_id = v_wallet;
  if v_available < p_amount_minor then raise exception 'insufficient available balance'; end if;

  v_transaction := public.wrs_post_ledger_transaction(
    p_user_id,'withdrawal-reserve','withdrawal-reserve:' || p_idempotency_key,'withdrawal-reserve:' || p_idempotency_key,
    null,null,
    jsonb_build_array(
      jsonb_build_object('accountCode',v_wallet_code,'direction','debit','amountMinor',p_amount_minor,'currency',v_currency),
      jsonb_build_object('accountCode',v_pending_code,'direction','credit','amountMinor',p_amount_minor,'currency',v_currency)
    ),'{}'::jsonb
  );

  insert into public.withdrawals(user_id,payout_method_id,amount_minor,currency,reference,idempotency_key,reservation_transaction_id)
  values (p_user_id,p_payout_method_id,p_amount_minor,v_currency,'wrs-wd-' || gen_random_uuid(),p_idempotency_key,v_transaction)
  returning * into v_withdrawal;
  return jsonb_build_object('withdrawalId',v_withdrawal.id,'reference',v_withdrawal.reference,'status',v_withdrawal.status);
end;
$$;

create or replace function public.wrs_mark_withdrawal_provider_pending(
  p_withdrawal_id uuid,
  p_provider_reference text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.withdrawals set provider_reference = p_provider_reference, status = 'provider_pending', updated_at = now()
  where id = p_withdrawal_id and status in ('reserved','provider_pending');
  if not found then raise exception 'withdrawal not reservable'; end if;
end;
$$;

create or replace function public.wrs_fail_withdrawal(p_withdrawal_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_w public.withdrawals%rowtype;
  v_wallet_code text;
  v_pending_code text;
  v_transaction uuid;
begin
  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if v_w.id is null then raise exception 'withdrawal not found'; end if;
  if v_w.status = 'failed' then return jsonb_build_object('status','failed','withdrawalId',v_w.id); end if;
  if v_w.status = 'succeeded' then raise exception 'settled withdrawal cannot fail'; end if;
  v_wallet_code := 'liability:wallet:' || v_w.user_id || ':' || v_w.currency;
  v_pending_code := 'liability:withdrawals:' || v_w.currency;
  v_transaction := public.wrs_post_ledger_transaction(
    v_w.user_id,'withdrawal-fail','withdrawal-fail:' || v_w.id,'withdrawal-fail:' || v_w.id,
    v_w.provider,v_w.provider_reference,
    jsonb_build_array(
      jsonb_build_object('accountCode',v_pending_code,'direction','debit','amountMinor',v_w.amount_minor,'currency',v_w.currency),
      jsonb_build_object('accountCode',v_wallet_code,'direction','credit','amountMinor',v_w.amount_minor,'currency',v_w.currency)
    ),jsonb_build_object('reason',p_reason)
  );
  update public.withdrawals set status='failed',failure_reason=p_reason,failure_transaction_id=v_transaction,updated_at=now() where id=v_w.id;
  return jsonb_build_object('status','failed','withdrawalId',v_w.id,'transactionId',v_transaction);
end;
$$;

create or replace function public.wrs_settle_withdrawal(
  p_provider text,
  p_provider_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_provider_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_w public.withdrawals%rowtype;
  v_pending_code text;
  v_cash_code text;
  v_transaction uuid;
begin
  select * into v_w from public.withdrawals where provider=p_provider and provider_reference=p_provider_reference for update;
  if v_w.id is null then raise exception 'withdrawal not found'; end if;
  if v_w.status='succeeded' then return jsonb_build_object('status','succeeded','withdrawalId',v_w.id); end if;
  if lower(p_provider_status) not in ('success','successful') then return jsonb_build_object('status',v_w.status,'withdrawalId',v_w.id); end if;
  if v_w.amount_minor<>p_amount_minor or v_w.currency<>upper(p_currency) then raise exception 'transfer amount or currency mismatch'; end if;
  v_pending_code := 'liability:withdrawals:' || v_w.currency;
  v_cash_code := 'asset:paystack:' || v_w.currency;
  perform public.wrs_ensure_finance_account(null,v_cash_code,'asset','debit',v_w.currency);
  v_transaction := public.wrs_post_ledger_transaction(
    v_w.user_id,'withdrawal-settle','withdrawal-settle:' || v_w.id,'withdrawal-settle:' || v_w.id,
    p_provider,p_provider_reference,
    jsonb_build_array(
      jsonb_build_object('accountCode',v_pending_code,'direction','debit','amountMinor',v_w.amount_minor,'currency',v_w.currency),
      jsonb_build_object('accountCode',v_cash_code,'direction','credit','amountMinor',v_w.amount_minor,'currency',v_w.currency)
    ),'{}'::jsonb
  );
  update public.withdrawals set status='succeeded',settlement_transaction_id=v_transaction,updated_at=now() where id=v_w.id;
  return jsonb_build_object('status','succeeded','withdrawalId',v_w.id,'transactionId',v_transaction);
end;
$$;

revoke all on function public.wrs_ensure_finance_account(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.wrs_post_ledger_transaction(uuid,text,text,text,text,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.wrs_create_payment_intent(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.wrs_attach_payment_provider_reference(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.wrs_settle_payment(uuid,text,text,bigint,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.wrs_wallet_snapshot(uuid,text) from public, anon, authenticated;
revoke all on function public.wrs_reserve_withdrawal(uuid,uuid,bigint,text,text) from public, anon, authenticated;
revoke all on function public.wrs_mark_withdrawal_provider_pending(uuid,text) from public, anon, authenticated;
revoke all on function public.wrs_fail_withdrawal(uuid,text) from public, anon, authenticated;
revoke all on function public.wrs_settle_withdrawal(text,text,bigint,text,text) from public, anon, authenticated;

grant execute on function public.wrs_ensure_finance_account(uuid,text,text,text,text) to service_role;
grant execute on function public.wrs_post_ledger_transaction(uuid,text,text,text,text,text,jsonb,jsonb) to service_role;
grant execute on function public.wrs_create_payment_intent(uuid,text,text,text,text) to service_role;
grant execute on function public.wrs_attach_payment_provider_reference(uuid,uuid,text,text) to service_role;
grant execute on function public.wrs_settle_payment(uuid,text,text,bigint,text,text,text,jsonb) to service_role;
grant execute on function public.wrs_wallet_snapshot(uuid,text) to service_role;
grant execute on function public.wrs_reserve_withdrawal(uuid,uuid,bigint,text,text) to service_role;
grant execute on function public.wrs_mark_withdrawal_provider_pending(uuid,text) to service_role;
grant execute on function public.wrs_fail_withdrawal(uuid,text) to service_role;
grant execute on function public.wrs_settle_withdrawal(text,text,bigint,text,text) to service_role;
