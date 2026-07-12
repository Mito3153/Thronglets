-- Create thronglings table for persistent shared world
CREATE TABLE public.thronglings (
  id TEXT PRIMARY KEY,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  vx FLOAT NOT NULL,
  vy FLOAT NOT NULL,
  state TEXT NOT NULL,
  is_alive BOOLEAN NOT NULL DEFAULT true,
  body_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.thronglings;

-- Enable RLS
ALTER TABLE public.thronglings ENABLE ROW LEVEL SECURITY;

-- Create public access policies (shared public experience)
CREATE POLICY "Allow public read access" ON public.thronglings
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON public.thronglings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.thronglings
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON public.thronglings
  FOR DELETE USING (true);