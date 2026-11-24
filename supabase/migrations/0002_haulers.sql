-- Junk removal companies ("haulers"): apply in the app, approved by an admin. Safe to re-run. Run after 0001.

create table if not exists public.hauler_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_name text not null check (length(btrim(business_name)) between 2 and 80),
  description text check (length(description) <= 2000),
  -- What they haul. Same ids as lib/junk.ts ITEM_TYPES.
  item_types text[] not null check (
    cardinality(item_types) >= 1
    and item_types <@ array['furniture','appliances','electronics','mattresses','yard','construction',
                            'household','cleanout','hot_tub','metal','other']::text[]),
  takes_hazardous boolean not null default false,   -- paint, chemicals, tires, etc. (where allowed)
  insured boolean not null default false,
  zip text not null check (zip ~ '^[0-9]{5}$'),
  radius_miles int not null default 25 check (radius_miles in (10, 25, 50, 75, 100)),
  phone text not null check (length(btrim(phone)) between 7 and 25),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/photos/'),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.hauler_profiles enable row level security;

drop policy if exists "hauler_profiles: read own" on public.hauler_profiles;
create policy "hauler_profiles: read own" on public.hauler_profiles
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "hauler_profiles: apply as self, pending only" on public.hauler_profiles;
create policy "hauler_profiles: apply as self, pending only" on public.hauler_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and approval_status = 'pending');

drop policy if exists "hauler_profiles: update own" on public.hauler_profiles;
create policy "hauler_profiles: update own" on public.hauler_profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.hauler_profiles from anon, authenticated;
grant select, insert, update on public.hauler_profiles to authenticated;

-- approval_status is never set by the website. Changing the business name, ZIP, area or what they haul
-- sends the profile back to review. The SQL editor and admin functions pass through.
create or replace function public.guard_hauler_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.approval_status := 'pending';
    elsif (new.business_name, new.item_types, new.takes_hazardous, new.zip, new.radius_miles)
          is distinct from (old.business_name, old.item_types, old.takes_hazardous, old.zip, old.radius_miles) then
      new.approval_status := 'pending';
    else
      new.approval_status := old.approval_status;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists hauler_profiles_guard on public.hauler_profiles;
create trigger hauler_profiles_guard
  before insert or update on public.hauler_profiles
  for each row execute function public.guard_hauler_profile();

notify pgrst, 'reload schema';
