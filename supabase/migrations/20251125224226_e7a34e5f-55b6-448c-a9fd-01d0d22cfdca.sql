-- Update territory expansion timer to 4 days
UPDATE game_timers 
SET 
  duration_ms = 345600000,
  target_time = EXTRACT(EPOCH FROM (now() + interval '4 days')) * 1000,
  updated_at = now()
WHERE id = 'territory_expansion';