-- Plan 5 idempotency isolation: a retry key may replay only the exact same
-- user's exact same economic request. Mismatched reuse fails closed.

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
  v_currency text := upper(p_currency);
begin
  select * into v_intent from public.payment_intents where idempotency_key = p_idempotency_key;
  if v_intent.id is not null then
    if v_intent.user_id <> p_user_id
       or v_intent.package_slug <> p_package_slug
       or v_intent.currency <> v_currency
       or v_intent.provider <> p_provider then
      raise exception 'payment idempotency key collision';
    end if;
    select normalized_email into v_email from public.user_profiles where user_id = p_user_id;
    return jsonb_build_object(
      'intentId',v_intent.id,
      'reference','wrs-pay-' || v_intent.id,
      'amountMinor',v_intent.amount_minor,
      'currency',v_intent.currency,
      'email',v_email
    );
  end if;

  select * into v_price from public.package_prices
  where package_slug = p_package_slug and currency = v_currency and active = true;
  if v_price.package_slug is null then raise exception 'active package price not found'; end if;
  select normalized_email into v_email from public.user_profiles where user_id = p_user_id;
  if v_email is null then raise exception 'user profile not found'; end if;

  insert into public.payment_intents(user_id,package_slug,amount_minor,currency,provider,idempotency_key)
  values (p_user_id,p_package_slug,v_price.amount_minor,v_price.currency,p_provider,p_idempotency_key)
  returning * into v_intent;

  return jsonb_build_object(
    'intentId',v_intent.id,
    'reference','wrs-pay-' || v_intent.id,
    'amountMinor',v_intent.amount_minor,
    'currency',v_intent.currency,
    'email',v_email
  );
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
  if not exists(
    select 1 from public.payout_methods
    where id=p_payout_method_id and user_id=p_user_id and status='verified' and currency=v_currency
  ) then
    raise exception 'verified payout method required';
  end if;

  select * into v_existing from public.withdrawals where idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.user_id <> p_user_id
       or v_existing.payout_method_id <> p_payout_method_id
       or v_existing.amount_minor <> p_amount_minor
       or v_existing.currency <> v_currency then
      raise exception 'withdrawal idempotency key collision';
    end if;
    return jsonb_build_object('withdrawalId',v_existing.id,'reference',v_existing.reference,'status',v_existing.status);
  end if;

  v_wallet := public.wrs_ensure_finance_account(p_user_id,v_wallet_code,'liability','credit',v_currency);
  perform public.wrs_ensure_finance_account(null,v_pending_code,'liability','credit',v_currency);
  select coalesce(sum(case when direction='credit' then amount_minor else -amount_minor end),0)
    into v_available from public.ledger_entries where account_id=v_wallet;
  if v_available < p_amount_minor then raise exception 'insufficient available balance'; end if;

  v_transaction := public.wrs_post_ledger_transaction(
    p_user_id,'withdrawal-reserve','withdrawal-reserve:' || p_idempotency_key,
    'withdrawal-reserve:' || p_idempotency_key,null,null,
    jsonb_build_array(
      jsonb_build_object('accountCode',v_wallet_code,'direction','debit','amountMinor',p_amount_minor,'currency',v_currency),
      jsonb_build_object('accountCode',v_pending_code,'direction','credit','amountMinor',p_amount_minor,'currency',v_currency)
    ),'{}'::jsonb
  );

  insert into public.withdrawals(
    user_id,payout_method_id,amount_minor,currency,reference,idempotency_key,reservation_transaction_id
  ) values (
    p_user_id,p_payout_method_id,p_amount_minor,v_currency,'wrs-wd-' || gen_random_uuid(),p_idempotency_key,v_transaction
  ) returning * into v_withdrawal;

  return jsonb_build_object('withdrawalId',v_withdrawal.id,'reference',v_withdrawal.reference,'status',v_withdrawal.status);
end;
$$;

revoke all on function public.wrs_create_payment_intent(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.wrs_reserve_withdrawal(uuid,uuid,bigint,text,text) from public,anon,authenticated;
grant execute on function public.wrs_create_payment_intent(uuid,text,text,text,text) to service_role;
grant execute on function public.wrs_reserve_withdrawal(uuid,uuid,bigint,text,text) to service_role;
