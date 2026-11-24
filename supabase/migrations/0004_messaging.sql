-- In-app messaging between a customer and a junk removal company about one job. Safe to re-run. Run after 0003.
-- Phone numbers and emails are never shown; the company's phone is revealed only once the customer hires them.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  hauler_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id <> hauler_id),
  unique (job_id, hauler_id)
);
create index if not exists conversations_customer_idx on public.conversations (customer_id, updated_at desc);
create index if not exists conversations_hauler_idx on public.conversations (hauler_id, updated_at desc);

alter table public.conversations enable row level security;
drop policy if exists "conversations: parties can read" on public.conversations;
create policy "conversations: parties can read" on public.conversations
  for select to authenticated using ((select auth.uid()) in (customer_id, hauler_id));
revoke all on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;      -- created only through start_conversation()

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_unread_idx on public.messages (conversation_id) where read_at is null;

alter table public.messages enable row level security;
drop policy if exists "messages: parties can read" on public.messages;
create policy "messages: parties can read" on public.messages
  for select to authenticated
  using (exists (select 1 from public.conversations c
                  where c.id = messages.conversation_id and (select auth.uid()) in (c.customer_id, c.hauler_id)));
drop policy if exists "messages: parties send as themselves" on public.messages;
create policy "messages: parties send as themselves" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid())
              and exists (select 1 from public.conversations c
                           where c.id = messages.conversation_id and (select auth.uid()) in (c.customer_id, c.hauler_id)));
revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;

create or replace function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();

-- Get-or-create the one thread for (job, company).
--   A customer calls it with p_hauler_id = a company that quoted on their job.
--   A company calls it without p_hauler_id, for a job it can quote on or already quoted on.
create or replace function public.start_conversation(p_job_id uuid, p_hauler_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  j public.jobs;
  h uuid;
  cid uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into j from public.jobs where id = p_job_id;
  if not found then raise exception 'Job not found'; end if;

  if j.customer_id = uid then
    h := p_hauler_id;
    if h is null or not exists (select 1 from public.job_quotes q where q.job_id = j.id and q.hauler_id = h) then
      raise exception 'You can message a company once it has quoted on your job';
    end if;
  else
    h := uid;
    if not (public.hauler_can_see_job(j.id)
            or exists (select 1 from public.job_quotes q where q.job_id = j.id and q.hauler_id = uid)) then
      raise exception 'This job is not available to you';
    end if;
  end if;

  insert into public.conversations (job_id, customer_id, hauler_id) values (j.id, j.customer_id, h)
  on conflict (job_id, hauler_id) do nothing;
  select id into cid from public.conversations where job_id = j.id and hauler_id = h;
  return cid;
end $$;

-- Inbox rows (or one conversation) for the caller. The other side is shown by business name (company) or
-- display name (customer), never by email.
create or replace function public.get_inbox(p_conversation_id uuid default null)
returns table (
  id uuid, job_id uuid, job_title text, job_status text, job_photo text,
  other_name text, other_avatar_url text, i_am text,
  last_body text, last_at timestamptz, last_sender_id uuid, unread_count int, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.job_id, j.title, j.status, j.photos[1],
         case when c.customer_id = (select auth.uid())
              then coalesce(hp.business_name, 'Company')
              else public.public_name(c.customer_id) end,
         case when c.customer_id = (select auth.uid()) then hp.avatar_url else cp.avatar_url end,
         case when c.customer_id = (select auth.uid()) then 'customer' else 'hauler' end,
         lm.body, lm.created_at, lm.sender_id,
         (select count(*)::int from public.messages m
           where m.conversation_id = c.id and m.sender_id <> (select auth.uid()) and m.read_at is null),
         c.updated_at
    from public.conversations c
    join public.jobs j on j.id = c.job_id
    left join public.hauler_profiles hp on hp.user_id = c.hauler_id
    left join public.profiles cp on cp.id = c.customer_id
    left join lateral (select m.body, m.created_at, m.sender_id from public.messages m
                        where m.conversation_id = c.id order by m.created_at desc limit 1) lm on true
   where (select auth.uid()) in (c.customer_id, c.hauler_id)
     and (case when p_conversation_id is null
               then exists (select 1 from public.messages m where m.conversation_id = c.id)
               else c.id = p_conversation_id end)
   order by c.updated_at desc;
$$;

create or replace function public.unread_count() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
   where (select auth.uid()) in (c.customer_id, c.hauler_id)
     and m.sender_id <> (select auth.uid()) and m.read_at is null;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.messages m set read_at = now()
   where m.conversation_id = p_conversation_id
     and m.sender_id <> (select auth.uid())
     and m.read_at is null
     and exists (select 1 from public.conversations c
                  where c.id = m.conversation_id and (select auth.uid()) in (c.customer_id, c.hauler_id));
$$;

revoke all on function public.start_conversation(uuid, uuid) from public, anon;
revoke all on function public.get_inbox(uuid) from public, anon;
revoke all on function public.unread_count() from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;
grant execute on function public.get_inbox(uuid) to authenticated;
grant execute on function public.unread_count() to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object or undefined_object then null;
end $$;

notify pgrst, 'reload schema';
