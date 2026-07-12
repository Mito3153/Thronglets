-- Reset target_time to 7 days from now
UPDATE game_timers 
SET target_time = EXTRACT(EPOCH FROM (now() + interval '7 days')) * 1000,
    updated_at = now()
WHERE id = 'territory_expansion';