-- Plan 4 XP hardening: a verified source/reference may award a robot once,
-- and the public passport projection is refreshed from the append-only ledger.

create unique index if not exists robot_xp_events_source_reference_idx
  on public.robot_xp_events(robot_id, source, reference_type, reference_id)
  where reversal_of is null;

create or replace function public.wrs_robot_level_for_xp(p_total_xp integer)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when greatest(p_total_xp, 0) >= 11000 then 16
    when greatest(p_total_xp, 0) >= 9200 then 15
    when greatest(p_total_xp, 0) >= 7600 then 14
    when greatest(p_total_xp, 0) >= 6200 then 13
    when greatest(p_total_xp, 0) >= 5000 then 12
    when greatest(p_total_xp, 0) >= 4000 then 11
    when greatest(p_total_xp, 0) >= 3200 then 10
    when greatest(p_total_xp, 0) >= 2500 then 9
    when greatest(p_total_xp, 0) >= 1900 then 8
    when greatest(p_total_xp, 0) >= 1400 then 7
    when greatest(p_total_xp, 0) >= 1000 then 6
    when greatest(p_total_xp, 0) >= 700 then 5
    when greatest(p_total_xp, 0) >= 450 then 4
    when greatest(p_total_xp, 0) >= 250 then 3
    when greatest(p_total_xp, 0) >= 100 then 2
    else 1
  end;
$$;

revoke all on function public.wrs_robot_level_for_xp(integer) from public, anon, authenticated;
grant execute on function public.wrs_robot_level_for_xp(integer) to service_role;

create or replace function public.wrs_append_robot_xp_event(
  p_user_id uuid,
  p_event jsonb
)
returns public.robot_xp_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_robot_id uuid := (p_event->>'robotId')::uuid;
  v_event_id uuid := (p_event->>'id')::uuid;
  v_reversal_of uuid := nullif(p_event->>'reversalOf', '')::uuid;
  v_amount integer := (p_event->>'amount')::integer;
  v_original public.robot_xp_events%rowtype;
  v_result public.robot_xp_events%rowtype;
  v_existing public.robot_xp_events%rowtype;
  v_total integer;
begin
  if not exists (
    select 1
    from public.robots r
    where r.id = v_robot_id
      and r.owner_user_id = p_user_id
      and r.lifecycle = 'active'
  ) then
    raise exception 'robot ownership mismatch';
  end if;

  if nullif(trim(p_event->>'idempotencyKey'), '') is null
     or nullif(trim(p_event->>'referenceType'), '') is null
     or nullif(trim(p_event->>'referenceId'), '') is null then
    raise exception 'XP idempotency and source reference are required';
  end if;

  -- First identity: explicit caller idempotency key.
  select * into v_existing
  from public.robot_xp_events
  where idempotency_key = p_event->>'idempotencyKey';

  if v_existing.id is not null then
    if v_existing.robot_id <> v_robot_id or v_existing.user_id <> p_user_id then
      raise exception 'idempotency key collision';
    end if;
    return v_existing;
  end if;

  if v_reversal_of is null then
    if v_amount <= 0 then
      raise exception 'XP award must be positive';
    end if;

    -- Second identity: verified business source/reference. Changing the
    -- idempotency key cannot award the same underlying activity twice.
    select * into v_existing
    from public.robot_xp_events
    where robot_id = v_robot_id
      and user_id = p_user_id
      and source = p_event->>'source'
      and reference_type = p_event->>'referenceType'
      and reference_id = p_event->>'referenceId'
      and reversal_of is null;

    if v_existing.id is not null then
      return v_existing;
    end if;
  else
    select * into v_original
    from public.robot_xp_events
    where id = v_reversal_of
      and robot_id = v_robot_id
      and user_id = p_user_id
      and reversal_of is null
    for update;

    if v_original.id is null then
      raise exception 'original XP event not found';
    end if;
    if exists (
      select 1 from public.robot_xp_events where reversal_of = v_reversal_of
    ) then
      raise exception 'XP event already reversed';
    end if;
    if v_amount <> -v_original.amount then
      raise exception 'reversal amount mismatch';
    end if;
  end if;

  insert into public.robot_xp_events(
    id,
    robot_id,
    user_id,
    source,
    amount,
    reference_type,
    reference_id,
    idempotency_key,
    reversal_of,
    metadata,
    created_at
  ) values (
    v_event_id,
    v_robot_id,
    p_user_id,
    p_event->>'source',
    v_amount,
    p_event->>'referenceType',
    p_event->>'referenceId',
    p_event->>'idempotencyKey',
    v_reversal_of,
    coalesce(p_event->'metadata', '{}'::jsonb),
    coalesce((p_event->>'createdAt')::timestamptz, now())
  )
  returning * into v_result;

  select greatest(coalesce(sum(amount), 0), 0)::integer
    into v_total
  from public.robot_xp_events
  where robot_id = v_robot_id;

  update public.robot_public_passports
  set total_xp = v_total,
      level = public.wrs_robot_level_for_xp(v_total),
      updated_at = now()
  where robot_id = v_robot_id;

  return v_result;
end;
$$;

revoke all on function public.wrs_append_robot_xp_event(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.wrs_append_robot_xp_event(uuid, jsonb) to service_role;
