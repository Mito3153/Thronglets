-- tool_uses: one row per granted tool use, so the free-tier count (1 tool per
-- wallet, then 0.002 SOL each) is server-authoritative and can't be bypassed
-- from the client. Written only by the service role (use-tool edge function).
create table if not exists public.tool_uses (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  tool_id text,
  created_at timestamptz not null default now()
);

create index if not exists tool_uses_wallet_idx on public.tool_uses (wallet);

alter table public.tool_uses enable row level security;
-- no public policies: only the service role (edge functions) may read/write.
