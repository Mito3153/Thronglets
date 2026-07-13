-- Lock down write access so every gated action MUST go through the service-role
-- edge functions (spawn-throng / use-tool / throng-chat / kill-throngling).
-- Before this, anon could INSERT/UPDATE/DELETE thronglings directly (skipping the
-- spawn payment + free tier) and INSERT chat_messages directly (forging the
-- free-message counter). Anon keeps READ so the client can load + follow realtime.

-- thronglings: read-only for anon; writes only via service role (bypasses RLS)
drop policy if exists thronglings_all on public.thronglings;
drop policy if exists thronglings_read on public.thronglings;
create policy thronglings_read on public.thronglings
  for select to anon, authenticated using (true);

-- chat_messages: drop the anon INSERT so only throng-chat (service role) writes;
-- the existing chat_read (SELECT) policy stays so the shared thread is visible.
drop policy if exists chat_insert on public.chat_messages;
