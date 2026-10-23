create table if not exists public.student_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_state enable row level security;
drop policy if exists "Students manage their own state" on public.student_state;
create policy "Students manage their own state"
  on public.student_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-avatars', 'student-avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Students manage their own avatar files" on storage.objects;
create policy "Students manage their own avatar files"
  on storage.objects for all to authenticated
  using (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'student-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.student_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (length(event_type) between 1 and 64),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  activity_date date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now()
);

alter table public.student_usage_events
  add column if not exists activity_date date not null default ((now() at time zone 'utc')::date);

create index if not exists student_usage_events_recent_idx
  on public.student_usage_events (created_at desc, user_id);
create unique index if not exists student_usage_events_one_per_user_day_idx
  on public.student_usage_events (user_id, activity_date);

alter table public.student_usage_events enable row level security;
drop policy if exists "Students read their own usage" on public.student_usage_events;
create policy "Students read their own usage"
  on public.student_usage_events for select
  using (auth.uid() = user_id);
drop policy if exists "Students append their own usage" on public.student_usage_events;
revoke insert on public.student_usage_events from anon, authenticated;

create or replace function public.record_student_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  insert into public.student_usage_events (user_id, event_type, activity_date)
  values (auth.uid(), 'workspace_active', (now() at time zone 'utc')::date)
  on conflict (user_id, activity_date) do nothing;
end;
$function$;

revoke all on function public.record_student_activity() from public;
grant execute on function public.record_student_activity() to authenticated;

create table if not exists public.pro_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pro_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.pro_entitlements enable row level security;
drop policy if exists "Students read their own entitlement" on public.pro_entitlements;
create policy "Students read their own entitlement"
  on public.pro_entitlements for select
  using (auth.uid() = user_id);

create table if not exists public.owner_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.owner_accounts enable row level security;
drop policy if exists "Owners read their own owner record" on public.owner_accounts;
create policy "Owners read their own owner record"
  on public.owner_accounts for select
  using (auth.uid() = user_id);

create table if not exists public.pro_allowlist (
  email text primary key check (email = lower(email)),
  granted_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.pro_allowlist enable row level security;
revoke all on public.pro_allowlist from anon, authenticated;
drop policy if exists "Owner manages Pro allowlist" on public.pro_allowlist;
create policy "Owner manages Pro allowlist"
  on public.pro_allowlist for all
  using (exists (
    select 1 from public.owner_accounts as owners where owners.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.owner_accounts as owners where owners.user_id = auth.uid()
  ));

create or replace function public.user_has_pro_access(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (select 1 from public.owner_accounts where user_id = target_user)
    or exists (select 1 from public.pro_entitlements where user_id = target_user and pro_active)
    or exists (
      select 1 from public.pro_allowlist as allowed
      join auth.users as users on lower(users.email) = allowed.email
      where users.id = target_user
    );
$function$;

revoke all on function public.user_has_pro_access(uuid) from public;

create or replace function public.enforce_daily_schedule_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  over_limit_date text;
begin
  if jsonb_typeof(new.state -> 'dailySchedules') = 'array'
    and not public.user_has_pro_access(new.user_id) then
    select schedule.value ->> 'date'
      into over_limit_date
      from jsonb_array_elements(new.state -> 'dailySchedules') as schedule(value)
      group by schedule.value ->> 'date'
      having count(*) > 4
      limit 1;
    if over_limit_date is not null then
      raise exception 'Free accounts may schedule at most four blocks per day';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_daily_schedule_limit on public.student_state;
create trigger enforce_daily_schedule_limit
  before insert or update of state on public.student_state
  for each row execute function public.enforce_daily_schedule_limit();

create or replace function public.get_current_user_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select public.user_has_pro_access(auth.uid());
$function$;

revoke all on function public.get_current_user_pro() from public;
grant execute on function public.get_current_user_pro() to authenticated;

create or replace function public.provision_studyarc_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if lower(new.email) = 'alt.s151102@gmail.com'
    and new.email_confirmed_at is not null
    and new.raw_app_meta_data ->> 'provider' = 'google' then
    insert into public.owner_accounts (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists provision_studyarc_owner on auth.users;
create trigger provision_studyarc_owner
  after insert or update on auth.users
  for each row execute function public.provision_studyarc_owner();

create table if not exists public.payment_settings (
  id boolean primary key default true check (id),
  beneficiary_upi text not null default '8799340567@fam'
    check (beneficiary_upi = '8799340567@fam'),
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id, beneficiary_upi)
values (true, '8799340567@fam')
on conflict (id) do nothing;

alter table public.payment_settings enable row level security;
revoke all on public.payment_settings from anon, authenticated;

create table if not exists public.payment_change_requests (
  id bigint generated always as identity primary key,
  requested_by uuid not null references auth.users (id) on delete cascade,
  requested_upi text not null check (length(requested_upi) between 3 and 128),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.payment_change_requests enable row level security;
drop policy if exists "Owner reads payment change requests" on public.payment_change_requests;
create policy "Owner reads payment change requests"
  on public.payment_change_requests for select
  using (exists (
    select 1 from public.owner_accounts as owners
    where owners.user_id = auth.uid()
  ));

create or replace function public.get_public_usage_metrics()
returns table (active_students bigint, lock_percentage integer)
language sql
stable
security definer
set search_path = ''
as $function$
  select active.active_students,
    least(60, 10 + (active.active_students / 1000)::integer * 5)::integer
  from (
    select count(distinct events.user_id) as active_students
    from public.student_usage_events as events
    where events.created_at >= now() - interval '30 days'
  ) as active;
$function$;

revoke all on function public.get_public_usage_metrics() from public;
grant execute on function public.get_public_usage_metrics() to authenticated;

-- Backfill the owner's verified Google account and make its Pro entitlement permanent:
insert into public.owner_accounts (user_id)
select id from auth.users
where lower(email) = 'alt.s151102@gmail.com'
  and email_confirmed_at is not null
  and raw_app_meta_data ->> 'provider' = 'google'
on conflict (user_id) do nothing;