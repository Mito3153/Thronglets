-- Per-user private chat threads: each wallet (or anon browser id) gets its own
-- saved, resumable conversation with each throng — ChatGPT-style history.
alter table public.chat_messages add column if not exists user_id text;
create index if not exists chat_messages_thread_idx
  on public.chat_messages (throngling_id, user_id, created_at);
