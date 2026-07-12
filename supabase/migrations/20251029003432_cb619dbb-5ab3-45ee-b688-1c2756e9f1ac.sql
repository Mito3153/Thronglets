-- Update maximum throngling population to 150
UPDATE game_config 
SET value = '150'::jsonb, 
    updated_at = now() 
WHERE key = 'max_throngling_population';