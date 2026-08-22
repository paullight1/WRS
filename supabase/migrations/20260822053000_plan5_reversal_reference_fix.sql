-- A single provider transfer reference can legitimately produce more than one
-- economic ledger event (settlement and later reversal). The ledger keeps the
-- original provider reference in metadata, while each journal has a distinct
-- provider-event identity so the uniqueness guard still prevents duplicates.

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
  v_reversal_provider_reference text := p_provider_reference || ':reversal';
begin
  select * into v_w
  from public.withdrawals
  where provider=p_provider and provider_reference=p_provider_reference
  for update;

  if v_w.id is null then raise exception 'withdrawal not found'; end if;
  if v_w.status='reversed' then
    select id into v_transaction
    from public.ledger_transactions
    where idempotency_key='withdrawal-reversed:' || v_w.id;
    return jsonb_build_object('status','reversed','withdrawalId',v_w.id,'transactionId',coalesce(v_transaction,v_w.failure_transaction_id));
  end if;

  v_wallet_code := 'liability:wallet:' || v_w.user_id || ':' || v_w.currency;
  perform public.wrs_ensure_finance_account(v_w.user_id,v_wallet_code,'liability','credit',v_w.currency);

  if v_w.status in ('reserved','provider_pending') then
    v_pending_code := 'liability:withdrawals:' || v_w.currency;
    perform public.wrs_ensure_finance_account(null,v_pending_code,'liability','credit',v_w.currency);
    v_transaction := public.wrs_post_ledger_transaction(
      v_w.user_id,'withdrawal-reversed','withdrawal-reversed:' || v_w.id,'withdrawal-reversed:' || v_w.id,
      p_provider,v_reversal_provider_reference,
      jsonb_build_array(
        jsonb_build_object('accountCode',v_pending_code,'direction','debit','amountMinor',v_w.amount_minor,'currency',v_w.currency),
        jsonb_build_object('accountCode',v_wallet_code,'direction','credit','amountMinor',v_w.amount_minor,'currency',v_w.currency)
      ),
      jsonb_build_object('reason',p_reason,'originalProviderReference',p_provider_reference)
    );
  elsif v_w.status='succeeded' then
    v_cash_code := 'asset:paystack:' || v_w.currency;
    perform public.wrs_ensure_finance_account(null,v_cash_code,'asset','debit',v_w.currency);
    v_transaction := public.wrs_post_ledger_transaction(
      v_w.user_id,'withdrawal-reversed','withdrawal-reversed:' || v_w.id,'withdrawal-reversed:' || v_w.id,
      p_provider,v_reversal_provider_reference,
      jsonb_build_array(
        jsonb_build_object('accountCode',v_cash_code,'direction','debit','amountMinor',v_w.amount_minor,'currency',v_w.currency),
        jsonb_build_object('accountCode',v_wallet_code,'direction','credit','amountMinor',v_w.amount_minor,'currency',v_w.currency)
      ),
      jsonb_build_object('reason',p_reason,'originalProviderReference',p_provider_reference)
    );
  elsif v_w.status='failed' then
    update public.withdrawals set status='reversed',updated_at=now(),failure_reason=p_reason where id=v_w.id;
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

revoke all on function public.wrs_reverse_withdrawal(text,text,text) from public,anon,authenticated;
grant execute on function public.wrs_reverse_withdrawal(text,text,text) to service_role;
