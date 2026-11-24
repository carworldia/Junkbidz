-- Admin: approve junk removal companies and see what's happening. Safe to re-run. Run after 0004.
--
-- Someone is an admin only if ALL of these are true:
--   1. their email is on public.admin_allowlist,
--   2. that email is confirmed, and
--   3. their profiles.is_admin switch is on. The website can never flip it (0001's trigger blocks it); only this SQL editor can.
--
-- BEFORE RUNNING: replace owner@example.com below with your own email (and add any other accounts of yours).
-- To add another account later (after it has signed up and confirmed its email), run:
--   insert into public.admin_allowlist (email) values ('you@example.com') on conflict do nothing;
--   update public.profiles set is_admin = true where id = (select id from auth.users where lower(email) = 'you@example.com');

create table if not exists public.admin_allowlist (email text primary key check (email = lower(btrim(email))));
alter table public.admin_allowlist enable row level security;        -- no policies: invisible to the website
revoke all on public.admin_allowlist from anon, authenticated;

insert into public.admin_allowlist (email) values
  ('owner@example.com')
on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.id = (select auth.uid())
       and p.is_admin
       and u.email_confirmed_at is not null
       and lower(u.email) in (select a.email from public.admin_allowlist a))
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Numbers for the dashboard.
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return jsonb_build_object(
    'users',            (select count(*) from auth.users),
    'users_7d',         (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'haulers',          (select count(*) from public.hauler_profiles where approval_status = 'approved'),
    'haulers_pending',  (select count(*) from public.hauler_profiles where approval_status = 'pending'),
    'jobs_open',        (select count(*) from public.jobs where status = 'open'),
    'jobs_hired',       (select count(*) from public.jobs where status = 'hired'),
    'jobs_completed',   (select count(*) from public.jobs where status = 'completed'),
    'jobs_7d',          (select count(*) from public.jobs where created_at > now() - interval '7 days'),
    'quotes_7d',        (select count(*) from public.job_quotes where created_at > now() - interval '7 days'),
    'messages_7d',      (select count(*) from public.messages where created_at > now() - interval '7 days'));
end $$;

create or replace function public.admin_list_haulers()
returns table (user_id uuid, email text, business_name text, description text, item_types text[],
               takes_hazardous boolean, insured boolean, zip text, radius_miles int, phone text,
               avatar_url text, approval_status text, created_at timestamptz,
               quotes int, jobs_won int, rating numeric, reviews int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query
    select hp.user_id, u.email::text, hp.business_name, hp.description, hp.item_types, hp.takes_hazardous,
           hp.insured, hp.zip, hp.radius_miles, hp.phone, hp.avatar_url, hp.approval_status, hp.created_at,
           (select count(*)::int from public.job_quotes q where q.hauler_id = hp.user_id),
           (select count(*)::int from public.job_quotes q where q.hauler_id = hp.user_id and q.status = 'accepted'),
           (select round(avg(r.rating)::numeric, 1) from public.job_reviews r where r.hauler_id = hp.user_id),
           (select count(*)::int from public.job_reviews r where r.hauler_id = hp.user_id)
      from public.hauler_profiles hp
      join auth.users u on u.id = hp.user_id
     order by (hp.approval_status = 'pending') desc, hp.created_at desc;
end $$;

create or replace function public.admin_set_hauler_status(p_user_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'Invalid status'; end if;
  update public.hauler_profiles set approval_status = p_status where user_id = p_user_id;
  if not found then raise exception 'Company not found'; end if;
end $$;

create or replace function public.admin_list_jobs()
returns table (id uuid, title text, status text, zip text, city text, item_types text[], load_size text,
               budget numeric, created_at timestamptz, customer_email text, quotes int, hired_business text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query
    select j.id, j.title, j.status, j.zip, j.city, j.item_types, j.load_size, j.budget, j.created_at,
           u.email::text,
           (select count(*)::int from public.job_quotes q where q.job_id = j.id),
           (select hp.business_name from public.job_quotes q join public.hauler_profiles hp on hp.user_id = q.hauler_id
             where q.job_id = j.id and q.status = 'accepted' limit 1)
      from public.jobs j
      join auth.users u on u.id = j.customer_id
     order by j.created_at desc
     limit 300;
end $$;

create or replace function public.admin_list_people()
returns table (id uuid, email text, display_name text, zip text, created_at timestamptz, last_sign_in_at timestamptz,
               is_admin boolean, hauler_status text, jobs int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query
    select u.id, u.email::text, p.display_name, p.zip, u.created_at, u.last_sign_in_at,
           coalesce(p.is_admin, false), hp.approval_status,
           (select count(*)::int from public.jobs j where j.customer_id = u.id)
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join public.hauler_profiles hp on hp.user_id = u.id
     order by u.created_at desc
     limit 500;
end $$;

revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_list_haulers() from public, anon;
revoke all on function public.admin_set_hauler_status(uuid, text) from public, anon;
revoke all on function public.admin_list_jobs() from public, anon;
revoke all on function public.admin_list_people() from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_haulers() to authenticated;
grant execute on function public.admin_set_hauler_status(uuid, text) to authenticated;
grant execute on function public.admin_list_jobs() to authenticated;
grant execute on function public.admin_list_people() to authenticated;

-- Switch admin ON for allowlisted accounts that exist and are confirmed, OFF for everyone else.
insert into public.profiles (id)
  select u.id from auth.users u
   where lower(u.email) in (select email from public.admin_allowlist) and u.email_confirmed_at is not null
on conflict (id) do nothing;
update public.profiles p set is_admin = true
  from auth.users u
 where u.id = p.id and lower(u.email) in (select email from public.admin_allowlist) and u.email_confirmed_at is not null
   and not p.is_admin;
update public.profiles p set is_admin = false
 where p.is_admin
   and not exists (select 1 from auth.users u where u.id = p.id and lower(u.email) in (select email from public.admin_allowlist));

notify pgrst, 'reload schema';

-- Who is an admin now (shown below the editor).
select a.email, coalesce(p.is_admin, false) as is_admin, (u.email_confirmed_at is not null) as email_confirmed
  from public.admin_allowlist a
  left join auth.users u on lower(u.email) = a.email
  left join public.profiles p on p.id = u.id
 order by a.email;
