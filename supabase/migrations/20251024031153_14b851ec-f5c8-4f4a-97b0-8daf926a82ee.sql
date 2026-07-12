-- Create table for global game timers
CREATE TABLE IF NOT EXISTS public.game_timers (
  id text PRIMARY KEY,
  target_time bigint NOT NULL,
  duration_ms bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert initial territory expansion timer (5 days from now)
INSERT INTO public.game_timers (id, target_time, duration_ms)
VALUES (
  'territory_expansion',
  EXTRACT(EPOCH FROM (now() + interval '5 days'))::bigint * 1000,
  432000000  -- 5 days in milliseconds
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.game_timers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read timers
CREATE POLICY "Anyone can read game timers"
  ON public.game_timers
  FOR SELECT
  USING (true);

-- Only service role can update timers (for auto-reset)
CREATE POLICY "Service role can update game timers"
  ON public.game_timers
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Enable realtime for game_timers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_timers;