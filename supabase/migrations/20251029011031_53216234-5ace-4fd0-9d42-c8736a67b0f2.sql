-- Update territory expansion timer from 5 days to 7 days
UPDATE game_timers 
SET duration_ms = 604800000,
    updated_at = now()
WHERE id = 'territory_expansion';