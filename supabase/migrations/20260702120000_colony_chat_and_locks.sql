-- Throngle Colony — our own backend: colony state + multiplayer chat + one-talker lock.
-- Safe to run on a FRESH Supabase project (paste into SQL editor, or `supabase db push`).
-- Idempotent-ish: uses IF NOT EXISTS / CREATE OR REPLACE so re-running is safe.

-- ---------------------------------------------------------------------------
-- 1. thronglings — the colony. Ported so the existing game keeps working, plus
--    lock columns for click-to-chat. (Persona/mood/relationships come in phase 2.)
-- ---------------------------------------------------------------------------
create table if not exists public.thronglings (
  id                    text primary key,
  x                     double precision not null default 0,
  y                     double precision not null default 0,
  vx                    double precision not null default 0,
  vy                    double precision not null default 0,
  state                 text not null default 'wander',
  is_alive              boolean not null default true,
  body_color            text not null default '#F5C86A',
  accent_color          text not null default '#FF7F2A',
  name                  text,
  character_type        text not null default 'normal',
  -- chat lock: who (if anyone) is talking to this thronglet right now
  chat_locked_by        text,
  chat_lock_expires_at  timestamptz,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. chat_messages — every message, from humans and from thronglets. Broadcast
--    via Realtime so ALL clients render the conversation live over the creature.
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id             uuid primary key default gen_random_uuid(),
  throngling_id  text not null references public.thronglings(id) on delete cascade,
  role           text not null check (role in ('user', 'throngling')),
  sender_id      text,                 -- stable per-viewer id (the human); null for the thronglet
  sender_name    text,                 -- display handle shown in the bubble
  content        text not null check (char_length(content) between 1 and 500),
  created_at     timestamptz not null default now()
);

create index if not exists chat_messages_throngling_idx
  on public.chat_messages (throngling_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. The lock — atomic claim / refresh / release. SECURITY DEFINER so the
--    grant decision happens server-side in ONE statement: two viewers clicking
--    the same instant cannot both win. TTL + heartbeat means a closed tab
--    auto-frees the thronglet instead of locking it forever.
-- ---------------------------------------------------------------------------

-- Claim: succeeds only if the thronglet is free, expired, or already mine.
create or replace function public.claim_throngling_chat(
  _throngling_id text,
  _claimer       text,
  _ttl_seconds   int default 30
) returns boolean
language sql
security definer
set search_path = public
as $$
  update public.thronglings
     set chat_locked_by       = _claimer,
         chat_lock_expires_at = now() + make_interval(secs => _ttl_seconds)
   where id = _throngling_id
     and (chat_locked_by is null
          or chat_lock_expires_at < now()
          or chat_locked_by = _claimer)
  returning true;
$$;

-- Refresh (heartbeat): only extends if the lock is still mine and not expired.
create or replace function public.refresh_throngling_chat(
  _throngling_id text,
  _claimer       text,
  _ttl_seconds   int default 30
) returns boolean
language sql
security definer
set search_path = public
as $$
  update public.thronglings
     set chat_lock_expires_at = now() + make_interval(secs => _ttl_seconds)
   where id = _throngling_id
     and chat_locked_by = _claimer
     and chat_lock_expires_at >= now()
  returning true;
$$;

-- Release: only the holder can release.
create or replace function public.release_throngling_chat(
  _throngling_id text,
  _claimer       text
) returns void
language sql
security definer
set search_path = public
as $$
  update public.thronglings
     set chat_locked_by = null,
         chat_lock_expires_at = null
   where id = _throngling_id
     and chat_locked_by = _claimer;
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS — permissive for a public game (no sensitive data). The game seeds +
--    reads thronglings with the anon key; everyone reads + posts chat. The lock
--    is enforced through the SECURITY DEFINER RPCs above, not RLS.
--    NOTE: a determined user could still hit the table directly — fine for a
--    game, not money. Tighten later (restrict lock-column UPDATEs) if needed.
-- ---------------------------------------------------------------------------
alter table public.thronglings  enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists thronglings_all on public.thronglings;
create policy thronglings_all on public.thronglings
  for all to anon, authenticated using (true) with check (true);

drop policy if exists chat_read on public.chat_messages;
create policy chat_read on public.chat_messages
  for select to anon, authenticated using (true);

drop policy if exists chat_insert on public.chat_messages;
create policy chat_insert on public.chat_messages
  for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- 5. Realtime — push row changes to every connected client.
-- ---------------------------------------------------------------------------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.thronglings'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.chat_messages'; exception when duplicate_object then null; end;
end $$;
