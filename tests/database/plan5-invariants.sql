\set ON_ERROR_STOP on

insert into auth.users(id,email,phone)
values ('00000000-0000-4000-8000-000000000501','finance@example.com','+2348012345678')
on conflict (id) do nothing;

insert into public.user_profiles(
  user_id,full_name,normalized_email,normalized_phone,status,terms_version,privacy_version,
  email_verified_at,phone_verified_at,kyc_status
) values (
  '00000000-0000-4000-8000-000000000501','Finance Test','finance@example.com','+2348012345678',
  'active','2026-01','2026-01',now(),now(),'verified'
) on conflict (user_id) do nothing;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-000000000501';
  v_intent jsonb;
  v_intent_id uuid;
  v_settlement jsonb;
  v_before bigint;
  v_after bigint;
  v_wallet jsonb;
  v_payout uuid;
  v_withdrawal jsonb;
  v_withdrawal_id uuid;
  v_reference text;
  v_tx uuid;
  v_refund jsonb;
begin
  -- Payment intent prices come from server-owned package_prices.
  v_intent := public.wrs_create_payment_intent(v_user,'professional','USD','paystack','plan5-payment-idempotency-0001');
  v_intent_id := (v_intent->>'intentId')::uuid;
  if (v_intent->>'amountMinor')::bigint <> 10000 then raise exception 'unexpected authoritative package price'; end if;

  -- A retry key cannot be reused for different economic parameters.
  begin
    perform public.wrs_create_payment_intent(v_user,'starter','USD','paystack','plan5-payment-idempotency-0001');
    raise exception 'expected payment idempotency collision';
  exception when others then
    if sqlerrm = 'expected payment idempotency collision' then raise; end if;
    if position('idempotency key collision' in sqlerrm) = 0 then raise; end if;
  end;

  perform public.wrs_attach_payment_provider_reference(v_user,v_intent_id,'paystack-plan5-payment-0001','access-plan5');
  v_settlement := public.wrs_settle_payment(
    v_user,'paystack','paystack-plan5-payment-0001',10000,'USD','success','event-plan5-payment-0001','{}'::jsonb
  );
  if v_settlement->>'status' <> 'succeeded' then raise exception 'verified payment did not settle'; end if;

  if not exists(
    select 1 from public.package_entitlements
    where user_id=v_user and package_slug='professional' and status='active'
      and source='payment' and source_reference='paystack-plan5-payment-0001'
  ) then raise exception 'payment did not activate package entitlement'; end if;

  select count(*) into v_before from public.ledger_transactions where idempotency_key='payment-settle:' || v_intent_id;
  perform public.wrs_settle_payment(
    v_user,'paystack','paystack-plan5-payment-0001',10000,'USD','success','event-plan5-payment-0002','{}'::jsonb
  );
  select count(*) into v_after from public.ledger_transactions where idempotency_key='payment-settle:' || v_intent_id;
  if v_before <> 1 or v_after <> 1 then raise exception 'duplicate settlement posted more than once'; end if;

  if exists(
    select 1
    from public.ledger_transactions t
    join lateral (
      select
        coalesce(sum(case when e.direction='debit' then e.amount_minor else 0 end),0) as debit_total,
        coalesce(sum(case when e.direction='credit' then e.amount_minor else 0 end),0) as credit_total
      from public.ledger_entries e where e.transaction_id=t.id
    ) sums on true
    where t.status='posted' and sums.debit_total <> sums.credit_total
  ) then raise exception 'posted ledger contains an unbalanced transaction'; end if;

  -- Seed verified earnings into the user wallet through the same ledger API.
  perform public.wrs_ensure_finance_account(null,'asset:earnings:USD','asset','debit','USD');
  perform public.wrs_ensure_finance_account(v_user,'liability:wallet:' || v_user || ':USD','liability','credit','USD');
  v_tx := public.wrs_post_ledger_transaction(
    v_user,'verified-earnings','verified-earnings-plan5','verified-earnings-plan5',null,null,
    jsonb_build_array(
      jsonb_build_object('accountCode','asset:earnings:USD','direction','debit','amountMinor',5000,'currency','USD'),
      jsonb_build_object('accountCode','liability:wallet:' || v_user || ':USD','direction','credit','amountMinor',5000,'currency','USD')
    ),'{}'::jsonb
  );
  if v_tx is null then raise exception 'verified earnings journal did not post'; end if;

  insert into public.payout_methods(user_id,provider,recipient_code,masked_account,bank_code,account_name,currency,status)
  values(v_user,'paystack','RCP_PLAN5_TEST','******5678','058','Finance Test','USD','verified')
  returning id into v_payout;

  -- Failure compensation restores reserved wallet funds exactly once.
  v_withdrawal := public.wrs_reserve_withdrawal(v_user,v_payout,1000,'USD','plan5-withdraw-fail-0001');
  v_withdrawal_id := (v_withdrawal->>'withdrawalId')::uuid;
  begin
    perform public.wrs_reserve_withdrawal(v_user,v_payout,900,'USD','plan5-withdraw-fail-0001');
    raise exception 'expected withdrawal idempotency collision';
  exception when others then
    if sqlerrm = 'expected withdrawal idempotency collision' then raise; end if;
    if position('idempotency key collision' in sqlerrm) = 0 then raise; end if;
  end;
  v_wallet := public.wrs_wallet_snapshot(v_user,'USD');
  if (v_wallet->>'availableMinor')::bigint <> 4000 or (v_wallet->>'pendingWithdrawalMinor')::bigint <> 1000 then
    raise exception 'wallet reservation projection is incorrect';
  end if;
  perform public.wrs_fail_withdrawal(v_withdrawal_id,'test-provider-failure');
  perform public.wrs_fail_withdrawal(v_withdrawal_id,'duplicate-provider-failure');
  v_wallet := public.wrs_wallet_snapshot(v_user,'USD');
  if (v_wallet->>'availableMinor')::bigint <> 5000 or (v_wallet->>'pendingWithdrawalMinor')::bigint <> 0 then
    raise exception 'failed withdrawal did not compensate exactly once';
  end if;

  -- Provider settlement consumes reserved funds but does not double-debit on retry.
  v_withdrawal := public.wrs_reserve_withdrawal(v_user,v_payout,2000,'USD','plan5-withdraw-success-0001');
  v_withdrawal_id := (v_withdrawal->>'withdrawalId')::uuid;
  v_reference := v_withdrawal->>'reference';
  perform public.wrs_mark_withdrawal_provider_pending(v_withdrawal_id,v_reference);
  perform public.wrs_settle_withdrawal('paystack',v_reference,2000,'USD','success');
  perform public.wrs_settle_withdrawal('paystack',v_reference,2000,'USD','success');
  v_wallet := public.wrs_wallet_snapshot(v_user,'USD');
  if (v_wallet->>'availableMinor')::bigint <> 3000 or (v_wallet->>'pendingWithdrawalMinor')::bigint <> 0 then
    raise exception 'settled withdrawal projection is incorrect';
  end if;

  -- A later provider reversal restores the wallet through one compensating journal.
  perform public.wrs_reverse_withdrawal('paystack',v_reference,'test-transfer-reversed');
  perform public.wrs_reverse_withdrawal('paystack',v_reference,'duplicate-transfer-reversed');
  v_wallet := public.wrs_wallet_snapshot(v_user,'USD');
  if (v_wallet->>'availableMinor')::bigint <> 5000 or (v_wallet->>'pendingWithdrawalMinor')::bigint <> 0 then
    raise exception 'reversed transfer did not restore wallet exactly once';
  end if;

  -- Insufficient balance fails closed before a reservation can escape.
  begin
    perform public.wrs_reserve_withdrawal(v_user,v_payout,6000,'USD','plan5-withdraw-overdraft-0001');
    raise exception 'expected insufficient balance rejection';
  exception when others then
    if sqlerrm = 'expected insufficient balance rejection' then raise; end if;
    if position('insufficient available balance' in sqlerrm) = 0 then raise; end if;
  end;

  -- A partial refund posts a reversing journal but keeps the entitlement active.
  v_refund := public.wrs_process_payment_refund(
    'paystack','paystack-plan5-payment-0001','refund-plan5-partial',3000,'USD','refund-event-plan5-partial','{}'::jsonb
  );
  if v_refund->>'status' <> 'processed' or (v_refund->>'fullyRefunded')::boolean then
    raise exception 'partial refund projection is incorrect';
  end if;
  if not exists(
    select 1 from public.package_entitlements
    where user_id=v_user and source='payment' and source_reference='paystack-plan5-payment-0001' and status='active'
  ) then raise exception 'partial refund revoked entitlement'; end if;

  -- Final refund revokes the paid entitlement only after its ledger reversal posts.
  v_refund := public.wrs_process_payment_refund(
    'paystack','paystack-plan5-payment-0001','refund-plan5-final',7000,'USD','refund-event-plan5-final','{}'::jsonb
  );
  if not (v_refund->>'fullyRefunded')::boolean then raise exception 'full refund was not classified as full'; end if;
  perform public.wrs_process_payment_refund(
    'paystack','paystack-plan5-payment-0001','refund-plan5-final',7000,'USD','refund-event-plan5-final','{}'::jsonb
  );
  if exists(
    select 1 from public.package_entitlements
    where user_id=v_user and source='payment' and source_reference='paystack-plan5-payment-0001' and status='active'
  ) then raise exception 'fully refunded entitlement remained active'; end if;
  if (select status from public.payment_intents where id=v_intent_id) <> 'refunded' then
    raise exception 'fully refunded payment intent not marked refunded';
  end if;

  if exists(
    select 1
    from public.ledger_transactions t
    join lateral (
      select
        coalesce(sum(case when e.direction='debit' then e.amount_minor else 0 end),0) as debit_total,
        coalesce(sum(case when e.direction='credit' then e.amount_minor else 0 end),0) as credit_total
      from public.ledger_entries e where e.transaction_id=t.id
    ) sums on true
    where t.status='posted' and sums.debit_total <> sums.credit_total
  ) then raise exception 'reversal lifecycle created an unbalanced transaction'; end if;

  -- Imbalanced journals are impossible.
  begin
    perform public.wrs_post_ledger_transaction(
      v_user,'bad-journal','bad-journal-plan5','bad-journal-plan5',null,null,
      jsonb_build_array(
        jsonb_build_object('accountCode','asset:earnings:USD','direction','debit','amountMinor',100,'currency','USD'),
        jsonb_build_object('accountCode','liability:wallet:' || v_user || ':USD','direction','credit','amountMinor',99,'currency','USD')
      ),'{}'::jsonb
    );
    raise exception 'expected unbalanced journal rejection';
  exception when others then
    if sqlerrm = 'expected unbalanced journal rejection' then raise; end if;
    if position('balance' in sqlerrm) = 0 then raise; end if;
  end;

  -- Ledger entries are immutable; corrections must be compensating transactions.
  begin
    update public.ledger_entries set amount_minor=amount_minor+1 where id=(select min(id) from public.ledger_entries);
    raise exception 'expected append-only rejection';
  exception when others then
    if sqlerrm = 'expected append-only rejection' then raise; end if;
    if position('append-only' in sqlerrm) = 0 then raise; end if;
  end;
end;
$$;
