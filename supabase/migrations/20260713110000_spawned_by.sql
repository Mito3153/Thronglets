-- spawn-throng counts + writes thronglings.spawned_by to enforce the per-wallet
-- free spawn tier. This column was added live before it had a checked-in
-- migration; add it explicitly so a fresh `db push` reproduces the schema.
alter table public.thronglings add column if not exists spawned_by text;
create index if not exists thronglings_spawned_by_idx on public.thronglings (spawned_by);
