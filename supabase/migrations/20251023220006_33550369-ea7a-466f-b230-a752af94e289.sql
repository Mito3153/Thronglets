-- Fix function search path warnings by adding set search_path = public

-- Function to check and decrement free uses
CREATE OR REPLACE FUNCTION check_and_use_free_action(
  _wallet_address text,
  _action_type text,
  _initial_free_count integer
) RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Function to get current population count
CREATE OR REPLACE FUNCTION get_throngling_count() 
RETURNS integer 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM thronglings WHERE is_alive = true;
$$;

-- Function to check if population limit reached
CREATE OR REPLACE FUNCTION is_population_limit_reached() 
RETURNS boolean 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_pop integer;
  current_pop integer;
BEGIN
  SELECT (value::text)::integer INTO max_pop FROM game_config WHERE key = 'max_throngling_population';
  SELECT get_throngling_count() INTO current_pop;
  RETURN current_pop >= max_pop;
END;
$$;