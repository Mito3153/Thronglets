-- On-chain SOL payments ledger. A row here = a verified SOL transfer to the
-- treasury. tx_sig is UNIQUE so a payment can never be replayed. Only the
-- service role (the verify-payment edge function, after checking the chain)
-- may INSERT — anon can read (to show credits) but never write a fake payment.
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  tx_sig      text unique not null,
  wallet      text not null,
  kind        text not null,          -- 'chat' | 'spawn' | 'tool'
  lamports    bigint not null,
  created_at  timestamptz not null default now()
);
create index if not exists payments_wallet_kind_idx on public.payments (wallet, kind);

alter table public.payments enable row level security;
drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select to anon, authenticated using (true);
-- (no insert/update/delete policy for anon → only the service-role edge fn can write)
