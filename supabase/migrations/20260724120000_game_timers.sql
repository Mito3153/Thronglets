-- Territory-expansion countdown shown by GrowthBadge. One shared row all clients
-- read; reset-game-timer (service role) rolls target_time forward when it expires.
create table if not exists public.game_timers (
  id text primary key,
  target_time bigint not null,      -- unix ms the countdown targets
  duration_ms bigint not null default 432000000, -- 5 days
  updated_at timestamptz not null default now()
);

alter table public.game_timers enable row level security;
drop policy if exists game_timers_read on public.game_timers;
create policy game_timers_read on public.game_timers
  for select to anon, authenticated using (true);

-- realtime so the countdown updates live when it rolls over
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'game_timers'
  ) then
    alter publication supabase_realtime add table public.game_timers;
  end if;
end $$;

-- start (or restart) the timer 5 days out
insert into public.game_timers (id, target_time, duration_ms)
values ('territory_expansion', (extract(epoch from now()) * 1000)::bigint + 432000000, 432000000)
on conflict (id) do update
  set target_time = excluded.target_time,
      duration_ms = excluded.duration_ms,
      updated_at = now();
