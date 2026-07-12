-- Give every throng an inner life: a persona, a running task, a mood, memory,
-- and relationships. Generated once (cheap gpt-4.1-nano call), then it accrues
-- lived experience. `persona_prompt` is literally each throng's own system
-- prompt for chat — "their own prompt, their own task, their own life".

alter table public.thronglings
  add column if not exists persona        jsonb,                          -- {name, traits, backstory, voice, task}
  add column if not exists persona_prompt text,                           -- assembled system prompt for chat
  add column if not exists mood           real  not null default 0.2,     -- -1 despair .. +1 joy
  add column if not exists current_task   text,                           -- what it's doing on the island
  add column if not exists memory         jsonb not null default '[]'::jsonb,   -- rolling list of things it lived/heard
  add column if not exists relationships  jsonb not null default '{}'::jsonb;   -- otherId -> {affinity, note}
