-- Plan 5 reversal hardening: refunds and transfer reversals are compensating
-- ledger transactions. Historical entries are never mutated.

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references public.payment_intents(id) on delete restrict,
  provider text not null,
  provider_refund_reference text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  event_fingerprint text not null,
  status text not null default 'processed' check (status in ('processed','failed')),
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique(provider, provider_refund_reference),
  unique(provider, event_fingerprint)
);

alter table public.payment_refunds enable row level security;
revoke all on public.payment_refunds from anon, authenticated;

create or replace function public.wrs_process_payment_refund(
  p_provider text,
  p_provider_reference text,
  p_refund_reference text,
  p_amount_minor bigint,
  p_currency text,
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
  v_refund_reference text := coalesce(nullif(trim(p_refund_reference), ''), p_event_fingerprint);
  v_existing public.payment_refunds%rowtype;
  v_already_refunded bigint := 0;
  v_transaction uuid;
  v_cash_code text;
  v_revenue_code text;
begin
  if p_amount_minor <= 0 then raise exception 'refund amount must be positive'; end if;
  if upper(p_currency) !~ '^[A-Z]{3}$' then raise exception 'invalid refund currency'; end if;

  select * into v_existing
  from public.payment_refunds
  where provider = p_provider and provider_refund_reference = v_refund_reference;
  if v_existing.id is not null then
    return jsonb_build_object(
      'status', v_existing.status,
      'refundId', v_existing.id,
      'transactionId', v_existing.ledger_transaction_id
    );
  end if;

  select * into v_intent
  from public.payment_intents
  where provider = p_provider and provider_reference = p_provider_reference
  for update;

  if v_intent.id is null then raise exception 'payment intent not found'; end if;
  if v_intent.status not in ('succeeded','refunded') then raise exception 'payment is not refundable'; end if;
  if v_intent.currency <> upper(p_currency) then raise exception 'refund currency mismatch'; end if;

  select coalesce(sum(amount_minor),0) into v_already_refunded
  from public.payment_refunds
  where payment_intent_id = v_intent.id and status = 'processed';

  if v_already_refunded + p_amount_minor > v_intent.amount_minor then
    raise exception 'refund exceeds settled payment';
  end if;

  v_cash_code := 'asset:paystack:' || v_intent.currency;
  v_revenue_code := 'revenue:packages:' || v_intent.currency;
  perform public.wrs_ensure_finance_account(null,v_cash_code,'asset','debit',v_intent.currency);
  perform public.wrs_ensure_finance_account(null,v_revenue_code,'revenue','credit',v_intent.currency);

  v_transaction := public.wrs_post_ledger_transaction(
    v_intent.user_id,
    'package-payment-refund',
    'refund:' || v_refund_reference,
    'payment-refund:' || p_provider || ':' || v_refund_reference,
    p_provider,
    v_refund_reference,
    jsonb_build_array(
      jsonb_build_object('accountCode',v_revenue_code,'direction','debit','amountMinor',p_amount_minor,'currency',v_intent.currency),
      jsonb_build_object('accountCode',v_cash_code,'direction','credit','amountMinor',p_amount_minor,'currency',v_intent.currency)
    ),
    jsonb_build_object('paymentIntentId',v_intent.id,'providerPaymentReference',p_provider_reference)
  );

  insert into public.payment_refunds(
    payment_intent_id,provider,provider_refund_reference,amount_minor,currency,event_fingerprint,
    status,ledger_transaction_id,payload
  ) values (
    v_intent.id,p_provider,v_refund_reference,p_amount_minor,v_intent.currency,p_event_fingerprint,
    'processed',v_transaction,coalesce(p_payload,'{}'::jsonb)
  ) returning * into v_existing;

  if v_already_refunded + p_amount_minor = v_intent.amount_minor then
    update public.payment_intents set status='refunded',updated_at=now() where id=v_intent.id;
    update public.package_entitlements
      set status='revoked',updated_at=now()
      where user_id=v_intent.user_id and source='payment' and source_reference=p_provider_reference and status='active';
  end if;

  return jsonb_build_object(
    'status','processed',
    'refundId',v_existing.id,
    'transactionId',v_transaction,
    'fullyRefunded',(v_already_refunded + p_amount_minor = v_intent.amount_minor)
  );
end;
$$;

create or replace function public.wrs_reverse_withdrawal(
  p_provider text,
  p_provider_reference text,
  p_reason text default 'provider-reversed'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_w public.withdrawals%rowtype;
  v_wallet_code text;
  v_pending_code text;
  v_cash_code text;
  v_transaction uuid;
begin
  select * into v_w
  from public.withdrawals
  where provider=p_provider and provider_reference=p_provider_reference
  for update;

  if v_w.id is null then raise exception 'withdrawal not found'; end if;
  if v_w.status='reversed' then
    return jsonb_build_object('status','reversed','withdrawalId',v_w.id,'transactionId',v_w.settlement_transaction_id);
  end if;

  v_wallet_code := 'liability:wallet:' || v_w.user_id || ':' || v_w.currency;
  perform public.wrs_ensure_finance_account(v_w.user_id,v_wallet_code,'liability','credit',v_w.currency);

  if v_w.status in ('reserved','provider_pending') then
    v_pending_code := 'liability:withdrawals:' || v_w.currency;
    perform public.wrs_ensure_finance_account(null,v_pending_code,'liability','credit',v_w.currency);
    v_transaction := public.wrs_post_ledger_transaction(
      v_w.user_id,'withdrawal-reversed','withdrawal-reversed:' || v_w.id,'withdrawal-reversed:' || v_w.id,
      p_provider,p_provider_reference,
      jsonb_build_array(
        jsonb_build_object('accountCode',v_pending_code,'direction','debit','amountMinor',v_w.amount_minor,'currency',v_w.currency),
        jsonb_build_object('accountCode',v_wallet_code,'direction','credit','amountMinor',v_w.amount_minor,'currency',v_w.currency)
      ),jsonb_build_object('reason',p_reason)
    );
  elsif v_w.status='succeeded' then
    v_cash_code := 'asset:paystack:' || v_w.currency;
    perform public.wrs_ensure_finance_account(null,v_cash_code,'asset','debit',v_w.currency);
    v_transaction := public.wrs_post_ledger_transaction(
      v_w.user_id,'withdrawal-reversed','withdrawal-reversed:' || v_w.id,'withdrawal-reversed:' || v_w.id,
      p_provider,p_provider_reference,
      jsonb_build_array(
        jsonb_build_object('accountCode',v_cash_code,'direction','debit','amountMinor',v_w.amount_minor,'currency',v_w.currency),
        jsonb_build_object('accountCode',v_wallet_code,'direction','credit','amountMinor',v_w.amount_minor,'currency',v_w.currency)
      ),jsonb_build_object('reason',p_reason)
    );
  elsif v_w.status='failed' then
    -- A failed withdrawal has already been compensated. A later provider
    -- reversal carries no additional economic effect.
    update public.withdrawals set status='reversed',updated_at=now() where id=v_w.id;
    return jsonb_build_object('status','reversed','withdrawalId',v_w.id,'transactionId',v_w.failure_transaction_id);
  else
    raise exception 'withdrawal cannot be reversed from status %', v_w.status;
  end if;

  update public.withdrawals
    set status='reversed',updated_at=now(),failure_reason=p_reason
    where id=v_w.id;

  return jsonb_build_object('status','reversed','withdrawalId',v_w.id,'transactionId',v_transaction);
end;
$$;

-- A failed/compensated withdrawal must never later auto-settle and debit the
-- provider asset without removing the restored wallet liability.
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
  if v_w.status in ('failed','reversed') then
    return jsonb_build_object('status','manual-review','withdrawalId',v_w.id,'localStatus',v_w.status);
  end if;
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

revoke all on function public.wrs_process_payment_refund(text,text,text,bigint,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.wrs_reverse_withdrawal(text,text,text) from public, anon, authenticated;
grant execute on function public.wrs_process_payment_refund(text,text,text,bigint,text,text,jsonb) to service_role;
grant execute on function public.wrs_reverse_withdrawal(text,text,text) to service_role;
