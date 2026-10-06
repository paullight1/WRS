-- Seed the first playable industry. Manufacturing is the starter worksite;
-- other industry cards remain locked until they are intentionally released.
with starter_worksites(name, description, status) as (
  values
    ('Agriculture', 'Scanning crop rows and logging yield', 'pending'),
    ('Manufacturing', 'Feeding parts onto the assembly line', 'approved'),
    ('Logistics & Warehousing', 'Moving pallets between storage racks', 'pending'),
    ('Healthcare', 'Running supplies between hospital wards', 'pending'),
    ('Hospitality', 'Greeting guests and handling luggage', 'pending'),
    ('Retail', 'Restocking shelves and checking prices', 'pending'),
    ('Construction', 'Lifting steel into the frame', 'pending'),
    ('Security', 'Sweeping the perimeter on night patrol', 'pending'),
    ('Education', 'Walking a class through a lesson', 'pending')
)
insert into public.mining_worksites(name, description, status, approved_at)
select
  starter.name,
  starter.description,
  starter.status,
  case when starter.status = 'approved' then now() else null end
from starter_worksites starter
where not exists (
  select 1
  from public.mining_worksites existing
  where lower(trim(existing.name)) = lower(trim(starter.name))
);

update public.mining_worksites
set status = case when lower(trim(name)) = 'manufacturing' then 'approved' else 'pending' end,
    approved_at = case when lower(trim(name)) = 'manufacturing' then coalesce(approved_at, now()) else null end
where lower(trim(name)) in (
  'agriculture',
  'manufacturing',
  'logistics & warehousing',
  'healthcare',
  'hospitality',
  'retail',
  'construction',
  'security',
  'education'
);
