-- Plan 4 passport projections. The owner/API projection is service-role only;
-- the public verification projection exposes no owner PII, wallet or private metadata.

create or replace function public.wrs_get_robot_passport(
  p_user_id uuid,
  p_robot_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_passport public.robot_public_passports%rowtype;
  v_result jsonb;
begin
  if not exists (
    select 1
    from public.robots r
    where r.id = p_robot_id
      and r.owner_user_id = p_user_id
  ) then
    return null;
  end if;

  select * into v_passport
  from public.robot_public_passports
  where robot_id = p_robot_id;

  if v_passport.robot_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'authoritative', true,
    'robotId', v_passport.robot_id,
    'publicVerificationId', v_passport.public_verification_id,
    'name', v_passport.name,
    'robotClass', v_passport.robot_class,
    'packageSlug', v_passport.package_slug,
    'lifecycle', v_passport.lifecycle,
    'activationDate', v_passport.activation_date,
    'level', v_passport.level,
    'totalXp', v_passport.total_xp,
    'issuedAt', v_passport.issued_at,
    'skills', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'slug', s.skill_slug,
          'name', s.name,
          'version', s.version,
          'installedAt', s.installed_at,
          'verified', s.verified
        ) order by s.installed_at, s.id
      )
      from public.robot_skills s
      where s.robot_id = p_robot_id
    ), '[]'::jsonb),
    'certifications', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'slug', c.certification_slug,
          'name', c.name,
          'issuer', c.issuer,
          'issuedAt', c.issued_at,
          'expiresAt', c.expires_at,
          'verificationReference', c.verification_reference,
          'status', c.status
        ) order by c.issued_at, c.id
      )
      from public.robot_certifications c
      where c.robot_id = p_robot_id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', h.id,
          'eventType', h.event_type,
          'occurredAt', h.occurred_at,
          'publicSummary', h.public_summary
        ) order by h.occurred_at, h.id
      )
      from public.robot_history_events h
      where h.robot_id = p_robot_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.wrs_get_robot_passport(uuid, uuid) from public, anon, authenticated;
grant execute on function public.wrs_get_robot_passport(uuid, uuid) to service_role;

create or replace function public.wrs_verify_robot_passport(
  p_public_verification_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_passport public.robot_public_passports%rowtype;
begin
  select * into v_passport
  from public.robot_public_passports
  where public_verification_id = p_public_verification_id;

  if v_passport.robot_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'publicVerificationId', v_passport.public_verification_id,
    'name', v_passport.name,
    'robotClass', v_passport.robot_class,
    'packageSlug', v_passport.package_slug,
    'lifecycle', v_passport.lifecycle,
    'activationDate', v_passport.activation_date,
    'level', v_passport.level,
    'totalXp', v_passport.total_xp,
    'issuedAt', v_passport.issued_at,
    'verifiedSkills', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'slug', s.skill_slug,
          'name', s.name,
          'version', s.version
        ) order by s.installed_at, s.id
      )
      from public.robot_skills s
      where s.robot_id = v_passport.robot_id
        and s.verified = true
    ), '[]'::jsonb),
    'activeCertifications', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'slug', c.certification_slug,
          'name', c.name,
          'issuer', c.issuer,
          'issuedAt', c.issued_at,
          'expiresAt', c.expires_at,
          'verificationReference', c.verification_reference
        ) order by c.issued_at, c.id
      )
      from public.robot_certifications c
      where c.robot_id = v_passport.robot_id
        and c.status = 'active'
        and (c.expires_at is null or c.expires_at > now())
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.wrs_verify_robot_passport(uuid) from public;
grant execute on function public.wrs_verify_robot_passport(uuid) to anon, authenticated, service_role;

comment on function public.wrs_verify_robot_passport(uuid) is
  'Privacy-safe public robot verification. Deliberately excludes owner identity, financial records and private event metadata.';
