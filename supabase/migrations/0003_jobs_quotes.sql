-- Jobs, quotes and reviews. Safe to re-run. Run after 0002.
--
-- The loop: a customer posts a job → approved haulers whose area covers the job's ZIP (and who haul those items)
-- see it and send quotes → the customer accepts one (every other quote is closed) → the job is "hired" →
-- the customer marks it completed and can leave a review. All status changes go through the functions below.

-- ───────────── jobs ─────────────
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 80),
  item_types text[] not null check (
    cardinality(item_types) >= 1
    and item_types <@ array['furniture','appliances','electronics','mattresses','yard','construction',
                            'household','cleanout','hot_tub','metal','other']::text[]),
  load_size text not null check (load_size in ('single','small','half','full','multiple')),
  access text not null default 'curbside' check (access in ('curbside','garage','ground_floor','upstairs')),
  hazardous text not null default 'no' check (hazardous in ('no','yes','unsure')),
  description text not null default '' check (length(description) <= 3000),
  photos text[] not null default '{}' check (cardinality(photos) <= 8),
  zip text not null check (zip ~ '^[0-9]{5}$'),
  city text check (length(city) <= 60),
  pickup_date date,                       -- empty = flexible
  pickup_window text not null default 'flexible'
    check (pickup_window in ('morning','midday','afternoon','evening','flexible')),
  budget numeric(10,2) check (budget >= 0),
  status text not null default 'open' check (status in ('open','hired','completed','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists jobs_customer_idx on public.jobs (customer_id, created_at desc);
create index if not exists jobs_open_idx on public.jobs (status, created_at desc);

alter table public.jobs enable row level security;

-- Photos must come from this project's own bucket.
alter table public.jobs drop constraint if exists jobs_photos_own_bucket;
alter table public.jobs add constraint jobs_photos_own_bucket check (
  array_to_string(photos, ' ') = ''
  or array_to_string(photos, ' ') ~ '^(https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/photos/\S+ ?)+$');

-- The street address is private: only the customer and the hauler they hire can read it.
create table if not exists public.job_addresses (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  address text not null check (length(btrim(address)) between 5 and 200),
  access_notes text check (length(access_notes) <= 500)
);
alter table public.job_addresses enable row level security;

-- ───────────── quotes ─────────────
create table if not exists public.job_quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  hauler_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  -- [{by: 'hauler'|'customer', action: 'quote'|'counter'|'accept'|'decline'|'withdraw', price, message, at}]
  rounds jsonb not null default '[]'::jsonb,
  status text not null default 'submitted'
    check (status in ('submitted','countered','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hauler_id <> customer_id)
);
create index if not exists job_quotes_job_idx on public.job_quotes (job_id);
create index if not exists job_quotes_hauler_idx on public.job_quotes (hauler_id);
create index if not exists job_quotes_customer_idx on public.job_quotes (customer_id);
create unique index if not exists job_quotes_one_open_per_hauler
  on public.job_quotes (job_id, hauler_id) where status in ('submitted','countered');

alter table public.job_quotes enable row level security;

drop policy if exists "job_quotes: parties can read" on public.job_quotes;
create policy "job_quotes: parties can read" on public.job_quotes
  for select to authenticated using ((select auth.uid()) in (hauler_id, customer_id));

revoke all on public.job_quotes from anon, authenticated;
grant select on public.job_quotes to authenticated;          -- writes only through the functions below

-- ───────────── reviews ─────────────
create table if not exists public.job_reviews (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  hauler_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text check (length(body) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists job_reviews_hauler_idx on public.job_reviews (hauler_id);
alter table public.job_reviews enable row level security;

drop policy if exists "job_reviews: parties can read" on public.job_reviews;
create policy "job_reviews: parties can read" on public.job_reviews
  for select to authenticated using ((select auth.uid()) in (hauler_id, customer_id));
revoke all on public.job_reviews from anon, authenticated;
grant select on public.job_reviews to authenticated;

-- ───────────── who sees which job ─────────────
-- An approved hauler sees an open job when the job's ZIP is inside their area, they haul at least one of the
-- item types, and (for jobs marked hazardous) they take hazardous items. Never their own job.
create or replace function public.hauler_can_see_job(p_job_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.jobs j
      join public.hauler_profiles hp on hp.user_id = (select auth.uid())
     where j.id = p_job_id
       and j.status = 'open'
       and j.customer_id <> hp.user_id
       and hp.approval_status = 'approved'
       and j.item_types && hp.item_types
       and (j.hazardous <> 'yes' or hp.takes_hazardous)
       and public.zip_within(hp.zip, j.zip, hp.radius_miles));
$$;

drop policy if exists "jobs: customer reads own" on public.jobs;
create policy "jobs: customer reads own" on public.jobs
  for select to authenticated using (customer_id = (select auth.uid()));

drop policy if exists "jobs: matching haulers read open" on public.jobs;
create policy "jobs: matching haulers read open" on public.jobs
  for select to authenticated using (status = 'open' and public.hauler_can_see_job(id));

drop policy if exists "jobs: quoting haulers read" on public.jobs;
create policy "jobs: quoting haulers read" on public.jobs
  for select to authenticated
  using (exists (select 1 from public.job_quotes q where q.job_id = jobs.id and q.hauler_id = (select auth.uid())));

drop policy if exists "jobs: post for self" on public.jobs;
create policy "jobs: post for self" on public.jobs
  for insert to authenticated with check (customer_id = (select auth.uid()) and status = 'open');

revoke all on public.jobs from anon, authenticated;
grant select, insert on public.jobs to authenticated;          -- status changes only through set_job_status()

drop policy if exists "job_addresses: customer manages own" on public.job_addresses;
create policy "job_addresses: customer manages own" on public.job_addresses
  for all to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid())
              and exists (select 1 from public.jobs j where j.id = job_id and j.customer_id = (select auth.uid())));

drop policy if exists "job_addresses: hired hauler reads" on public.job_addresses;
create policy "job_addresses: hired hauler reads" on public.job_addresses
  for select to authenticated
  using (exists (select 1 from public.job_quotes q
                  where q.job_id = job_addresses.job_id and q.hauler_id = (select auth.uid()) and q.status = 'accepted'));

revoke all on public.job_addresses from anon, authenticated;
grant select, insert, update on public.job_addresses to authenticated;

-- ───────────── functions ─────────────
create or replace function public.submit_quote(p_job_id uuid, p_price numeric, p_message text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  j public.jobs;
  new_id uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_price is null or p_price <= 0 or p_price > 100000 then raise exception 'Enter a valid price'; end if;
  select * into j from public.jobs where id = p_job_id;
  if not found then raise exception 'Job not found'; end if;
  if j.customer_id = uid then raise exception 'You cannot quote your own job'; end if;
  if j.status <> 'open' then raise exception 'This job is no longer taking quotes'; end if;
  if not public.hauler_can_see_job(j.id) then
    raise exception 'Your company is not approved for this job (area or item types)';
  end if;

  insert into public.job_quotes (job_id, hauler_id, customer_id, status, rounds)
  values (j.id, uid, j.customer_id, 'submitted',
    jsonb_build_array(jsonb_build_object(
      'by', 'hauler', 'action', 'quote', 'price', round(p_price, 2),
      'message', nullif(left(btrim(coalesce(p_message, '')), 1000), ''), 'at', now())))
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'You already have an open quote on this job';
end $$;

-- p_action: accept | decline | counter | withdraw. Turn-based: you answer the other side's latest price.
-- decline is customer-only, withdraw is hauler-only. Accepting hires that hauler and closes every other quote.
create or replace function public.respond_quote(
  p_quote_id uuid, p_action text, p_price numeric default null, p_message text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  q public.job_quotes;
  j public.jobs;
  who text;
  last_by text;
  amt numeric;
  new_status text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into q from public.job_quotes where id = p_quote_id for update;
  if not found or uid not in (q.hauler_id, q.customer_id) then raise exception 'Quote not found'; end if;
  if q.status not in ('submitted','countered') then raise exception 'This quote is already closed'; end if;

  who := case when uid = q.customer_id then 'customer' else 'hauler' end;
  last_by := q.rounds -> -1 ->> 'by';
  amt := (q.rounds -> -1 ->> 'price')::numeric;

  if p_action = 'withdraw' then
    if who <> 'hauler' then raise exception 'Only the company can withdraw its quote'; end if;
    new_status := 'withdrawn';
  elsif p_action = 'decline' then
    if who <> 'customer' then raise exception 'Only the customer can decline'; end if;
    new_status := 'declined';
  else
    if who = last_by then raise exception 'Waiting on the other side to respond'; end if;
    if p_action = 'accept' then
      select * into j from public.jobs where id = q.job_id for update;
      if j.status <> 'open' then raise exception 'This job is no longer taking quotes'; end if;
      new_status := 'accepted';
    elsif p_action = 'counter' then
      if p_price is null or p_price <= 0 or p_price > 100000 then raise exception 'Enter a valid price'; end if;
      amt := round(p_price, 2);
      new_status := case when who = 'customer' then 'countered' else 'submitted' end;
    else
      raise exception 'Unknown action';
    end if;
  end if;

  update public.job_quotes
     set status = new_status, updated_at = now(),
         rounds = rounds || jsonb_build_array(jsonb_build_object(
           'by', who, 'action', p_action, 'price', amt,
           'message', nullif(left(btrim(coalesce(p_message, '')), 1000), ''), 'at', now()))
   where id = q.id;

  if new_status = 'accepted' then
    update public.jobs set status = 'hired' where id = q.job_id;
    update public.job_quotes
       set status = 'declined', updated_at = now(),
           rounds = rounds || jsonb_build_array(jsonb_build_object(
             'by', 'customer', 'action', 'decline', 'price', (rounds -> -1 ->> 'price')::numeric,
             'message', 'The customer hired another company', 'at', now()))
     where job_id = q.job_id and id <> q.id and status in ('submitted','countered');
  end if;
end $$;

-- The customer moves their own job along:
--   completed  (from hired)          the work is done
--   cancelled  (from open or hired)  no longer needed; open quotes are closed
--   open       (from hired)          the hired company fell through: their quote is closed and others can quote again
create or replace function public.set_job_status(p_job_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  j public.jobs;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into j from public.jobs where id = p_job_id and customer_id = uid for update;
  if not found then raise exception 'Job not found'; end if;

  if p_status = 'completed' then
    if j.status <> 'hired' then raise exception 'Accept a quote before marking the job done'; end if;
  elsif p_status = 'cancelled' then
    if j.status not in ('open','hired') then raise exception 'This job is already closed'; end if;
  elsif p_status = 'open' then
    if j.status <> 'hired' then raise exception 'Only a hired job can be reopened'; end if;
    update public.job_quotes
       set status = 'declined', updated_at = now(),
           rounds = rounds || jsonb_build_array(jsonb_build_object(
             'by', 'customer', 'action', 'decline', 'price', (rounds -> -1 ->> 'price')::numeric,
             'message', 'The customer reopened the job', 'at', now()))
     where job_id = j.id and status = 'accepted';
  else
    raise exception 'Invalid status';
  end if;

  update public.jobs set status = p_status where id = j.id;

  if p_status = 'cancelled' then
    update public.job_quotes
       set status = 'declined', updated_at = now(),
           rounds = rounds || jsonb_build_array(jsonb_build_object(
             'by', 'customer', 'action', 'decline', 'price', (rounds -> -1 ->> 'price')::numeric,
             'message', 'The customer cancelled the job', 'at', now()))
     where job_id = j.id and status in ('submitted','countered');
  end if;
end $$;

-- Quotes the caller is part of, with the company's name, logo, rating and distance to the job.
-- The company's phone is shown to the customer only once that quote is accepted.
create or replace function public.list_quotes(p_job_id uuid default null)
returns table (
  id uuid, job_id uuid, job_title text, job_status text, hauler_id uuid, customer_id uuid,
  business_name text, hauler_avatar_url text, hauler_phone text, insured boolean,
  rating numeric, reviews int, miles numeric,
  rounds jsonb, status text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select q.id, q.job_id, j.title, j.status, q.hauler_id, q.customer_id,
         hp.business_name, hp.avatar_url,
         case when q.status = 'accepted' and q.customer_id = (select auth.uid()) then hp.phone end,
         coalesce(hp.insured, false),
         rv.rating, coalesce(rv.reviews, 0),
         round(public.zip_distance_miles(hp.zip, j.zip)::numeric, 1),
         q.rounds, q.status, q.created_at, q.updated_at
    from public.job_quotes q
    join public.jobs j on j.id = q.job_id
    left join public.hauler_profiles hp on hp.user_id = q.hauler_id
    left join lateral (select round(avg(r.rating)::numeric, 1) as rating, count(*)::int as reviews
                         from public.job_reviews r where r.hauler_id = q.hauler_id) rv on true
   where (select auth.uid()) in (q.hauler_id, q.customer_id)
     and (p_job_id is null or q.job_id = p_job_id)
   order by q.updated_at desc;
$$;

-- Open jobs the calling hauler can quote, nearest first, with whether they already quoted.
create or replace function public.list_leads()
returns table (
  id uuid, title text, item_types text[], load_size text, access text, hazardous text, photos text[],
  zip text, city text, pickup_date date, pickup_window text, budget numeric, created_at timestamptz,
  miles numeric, quotes int, my_quote_status text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.title, j.item_types, j.load_size, j.access, j.hazardous, j.photos,
         j.zip, j.city, j.pickup_date, j.pickup_window, j.budget, j.created_at,
         round(public.zip_distance_miles(hp.zip, j.zip)::numeric, 1),
         (select count(*)::int from public.job_quotes x where x.job_id = j.id),
         (select x.status from public.job_quotes x where x.job_id = j.id and x.hauler_id = hp.user_id
           order by x.updated_at desc limit 1)
    from public.hauler_profiles hp
    join public.jobs j on j.status = 'open'
                      and j.customer_id <> hp.user_id
                      and j.item_types && hp.item_types
                      and (j.hazardous <> 'yes' or hp.takes_hazardous)
                      and public.zip_within(hp.zip, j.zip, hp.radius_miles)
   where hp.user_id = (select auth.uid()) and hp.approval_status = 'approved'
   order by 14 nulls last, j.created_at desc
   limit 100;
$$;

-- A company's public rating (for its profile and quotes).
create or replace function public.hauler_rating(p_hauler_id uuid)
returns table (rating numeric, reviews int)
language sql stable security definer set search_path = '' as $$
  select round(avg(rating)::numeric, 1), count(*)::int from public.job_reviews where hauler_id = p_hauler_id;
$$;

-- The customer reviews the company they hired, once the job is completed.
create or replace function public.leave_review(p_job_id uuid, p_rating int, p_body text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  j public.jobs;
  h uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Choose 1 to 5 stars'; end if;
  select * into j from public.jobs where id = p_job_id and customer_id = uid;
  if not found then raise exception 'Job not found'; end if;
  if j.status <> 'completed' then raise exception 'You can review once the job is marked done'; end if;
  select hauler_id into h from public.job_quotes where job_id = j.id and status = 'accepted' limit 1;
  if h is null then raise exception 'No hired company on this job'; end if;
  insert into public.job_reviews (job_id, hauler_id, customer_id, rating, body)
  values (j.id, h, uid, p_rating, nullif(left(btrim(coalesce(p_body, '')), 1000), ''))
  on conflict (job_id) do update set rating = excluded.rating, body = excluded.body, created_at = now();
end $$;

revoke all on function public.hauler_can_see_job(uuid) from public, anon;
revoke all on function public.submit_quote(uuid, numeric, text) from public, anon;
revoke all on function public.respond_quote(uuid, text, numeric, text) from public, anon;
revoke all on function public.set_job_status(uuid, text) from public, anon;
revoke all on function public.list_quotes(uuid) from public, anon;
revoke all on function public.list_leads() from public, anon;
revoke all on function public.hauler_rating(uuid) from public, anon;
revoke all on function public.leave_review(uuid, int, text) from public, anon;
grant execute on function public.hauler_can_see_job(uuid) to authenticated;
grant execute on function public.submit_quote(uuid, numeric, text) to authenticated;
grant execute on function public.respond_quote(uuid, text, numeric, text) to authenticated;
grant execute on function public.set_job_status(uuid, text) to authenticated;
grant execute on function public.list_quotes(uuid) to authenticated;
grant execute on function public.list_leads() to authenticated;
grant execute on function public.hauler_rating(uuid) to authenticated;
grant execute on function public.leave_review(uuid, int, text) to authenticated;

-- Live updates: quotes arrive on the customer's screen without a reload (Realtime applies the SELECT policy).
do $$ begin
  alter publication supabase_realtime add table public.job_quotes;
exception when duplicate_object or undefined_object then null;
end $$;

notify pgrst, 'reload schema';
