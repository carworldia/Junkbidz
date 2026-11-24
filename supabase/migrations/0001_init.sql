-- Clearbid core: profiles, photo storage, ZIP distance. Safe to re-run.
-- Run in the Supabase SQL editor, in order: 0001 → 0005, then the four files in supabase/seed/.

-- ───────────── profiles ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or length(btrim(display_name)) between 1 and 40),
  zip text check (zip is null or zip ~ '^[0-9]{5}$'),
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()) and not is_admin);
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name, zip, avatar_url) on public.profiles to authenticated;
grant update (display_name, zip, avatar_url) on public.profiles to authenticated;

-- The website can never change is_admin (only the SQL editor can; see 0005_admin.sql).
create or replace function public.guard_profile_admin_flag() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_admin := case when tg_op = 'UPDATE' then old.is_admin else false end;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_admin on public.profiles;
create trigger profiles_guard_admin
  before insert or update on public.profiles
  for each row execute function public.guard_profile_admin_flag();

-- Avatars must be photos from this project's own bucket (no outside links).
alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/photos/');

-- Auto-create an empty profile on signup.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The name another person sees: their display name, or "Member 3F9A".
create or replace function public.public_name(p_user_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(btrim(p.display_name), ''),
                  'Member ' || upper(left(replace(p_user_id::text, '-', ''), 4)))
    from (select 1) one
    left join public.profiles p on p.id = p_user_id;
$$;
revoke all on function public.public_name(uuid) from public, anon;
grant execute on function public.public_name(uuid) to authenticated;

-- ───────────── storage: one public "photos" bucket ─────────────
-- Public read; each person can only write inside their own <uid>/ folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos: upload to own folder" on storage.objects;
create policy "photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "photos: delete own" on storage.objects;
create policy "photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────────── ZIP distance ─────────────
-- Census 2023 ZCTA Gazetteer internal points (public domain), ~33.8k rows, loaded from supabase/seed/.
create table if not exists public.zip_coordinates (
  zip text primary key check (zip ~ '^[0-9]{5}$'),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180)
);
alter table public.zip_coordinates enable row level security;   -- read only by the functions below
revoke all on public.zip_coordinates from anon, authenticated;

-- Great-circle miles between two ZIPs; NULL if either ZIP is unknown.
create or replace function public.zip_distance_miles(a text, b text) returns double precision
language plpgsql stable security definer set search_path = '' as $$
declare
  la1 double precision; lo1 double precision; la2 double precision; lo2 double precision;
  h double precision;
begin
  select lat, lng into la1, lo1 from public.zip_coordinates where zip = left(btrim(coalesce(a, '')), 5);
  select lat, lng into la2, lo2 from public.zip_coordinates where zip = left(btrim(coalesce(b, '')), 5);
  if la1 is null or la2 is null then return null; end if;
  h := power(sin(radians(la2 - la1) / 2), 2)
     + cos(radians(la1)) * cos(radians(la2)) * power(sin(radians(lo2 - lo1) / 2), 2);
  return 3958.7613 * 2 * asin(least(1, sqrt(h)));
end $$;

-- Within radius? An unknown ZIP only matches the exact same ZIP (never a wide match).
create or replace function public.zip_within(a text, b text, radius int) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare d double precision;
begin
  d := public.zip_distance_miles(a, b);
  if d is null then
    return left(btrim(coalesce(a, '')), 5) <> '' and left(btrim(coalesce(a, '')), 5) = left(btrim(coalesce(b, '')), 5);
  end if;
  return d <= radius;
end $$;

revoke all on function public.zip_distance_miles(text, text) from public, anon;
revoke all on function public.zip_within(text, text, int) from public, anon;
grant execute on function public.zip_distance_miles(text, text) to authenticated;
grant execute on function public.zip_within(text, text, int) to authenticated;

notify pgrst, 'reload schema';
