-- Create wallet_actions table to track per-wallet daily limits
CREATE TABLE public.wallet_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  action_type text NOT NULL,
  action_date date NOT NULL DEFAULT CURRENT_DATE,
  free_uses_remaining integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(wallet_address, action_type, action_date)
);

-- Create game_config table for global settings
CREATE TABLE public.game_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insert max population config
INSERT INTO public.game_config (key, value) 
VALUES ('max_throngling_population', '500');

-- Function to check and decrement free uses
CREATE OR REPLACE FUNCTION check_and_use_free_action(
  _wallet_address text,
  _action_type text,
  _initial_free_count integer
) RETURNS boolean AS $$
DECLARE
  current_free_uses integer;
BEGIN
  INSERT INTO wallet_actions (wallet_address, action_type, action_date, free_uses_remaining)
  VALUES (_wallet_address, _action_type, CURRENT_DATE, _initial_free_count)
  ON CONFLICT (wallet_address, action_type, action_date) 
  DO NOTHING;
  
  SELECT free_uses_remaining INTO current_free_uses
  FROM wallet_actions
  WHERE wallet_address = _wallet_address 
    AND action_type = _action_type 
    AND action_date = CURRENT_DATE;
  
  IF current_free_uses > 0 THEN
    UPDATE wallet_actions
    SET free_uses_remaining = free_uses_remaining - 1,
        updated_at = now()
    WHERE wallet_address = _wallet_address 
      AND action_type = _action_type 
      AND action_date = CURRENT_DATE;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current population count
CREATE OR REPLACE FUNCTION get_throngling_count() 
RETURNS integer AS $$
  SELECT COUNT(*)::integer FROM thronglings WHERE is_alive = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if population limit reached
CREATE OR REPLACE FUNCTION is_population_limit_reached() 
RETURNS boolean AS $$
DECLARE
  max_pop integer;
  current_pop integer;
BEGIN
  SELECT (value::text)::integer INTO max_pop FROM game_config WHERE key = 'max_throngling_population';
  SELECT get_throngling_count() INTO current_pop;
  RETURN current_pop >= max_pop;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on new tables
ALTER TABLE public.wallet_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;

-- Public read on wallet_actions for transparency
CREATE POLICY "Users can read all actions"
  ON wallet_actions FOR SELECT
  USING (true);

-- Only service role can modify wallet_actions
CREATE POLICY "Service role can modify actions"
  ON wallet_actions FOR ALL
  USING (auth.role() = 'service_role');

-- Public read on config
CREATE POLICY "Public read config"
  ON game_config FOR SELECT
  USING (true);

-- Update RLS on thronglings: drop old permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON thronglings;
DROP POLICY IF EXISTS "Allow public insert access" ON thronglings;
DROP POLICY IF EXISTS "Allow public update access" ON thronglings;
DROP POLICY IF EXISTS "Allow public delete access" ON thronglings;

-- New policy: Read public, writes via service role only
CREATE POLICY "Anyone can read thronglings"
  ON thronglings FOR SELECT
  USING (true);

CREATE POLICY "Service role can modify thronglings"
  ON thronglings FOR ALL
  USING (auth.role() = 'service_role');