create table if not exists public.data_task_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  task_slug text not null,
  data_category text not null check (data_category in ('voice','face','movement','document','text','image','video','conversation')),
  consent_event_id bigint not null references public.consent_events(id) on delete restrict,
  response jsonb not null,
  status text not null default 'submitted' check (status in ('submitted','review','approved','rejected','deleted')),
  quality_score numeric(5,2),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists data_task_responses_user_idx on public.data_task_responses(user_id,submitted_at desc);
alter table public.data_task_responses enable row level security;
revoke all on public.data_task_responses from anon,authenticated;

create or replace function public.wrs_submit_data_task_response(
  p_user_id uuid,p_task_slug text,p_data_category text,p_response jsonb
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_consent bigint; v_id uuid;
begin
  if char_length(trim(p_task_slug))<2 then raise exception 'invalid task slug'; end if;
  if jsonb_typeof(p_response)<>'object' then raise exception 'task response must be an object'; end if;
  if not public.wrs_has_active_consent(p_user_id,'dataset-contribution',p_data_category) then raise exception 'active dataset-contribution consent required'; end if;
  select id into v_consent from public.consent_events
    where user_id=p_user_id and purpose_slug='dataset-contribution' and data_category=p_data_category and action='granted'
    order by occurred_at desc,id desc limit 1;
  insert into public.data_task_responses(user_id,task_slug,data_category,consent_event_id,response)
  values(p_user_id,trim(p_task_slug),p_data_category,v_consent,p_response)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.wrs_submit_data_task_response(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.wrs_submit_data_task_response(uuid,text,text,jsonb) to service_role;
