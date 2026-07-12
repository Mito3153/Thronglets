-- Add character_type column to thronglings table
ALTER TABLE public.thronglings
ADD COLUMN character_type text DEFAULT 'normal';

-- Add a comment to document the column
COMMENT ON COLUMN public.thronglings.character_type IS 'Character variant type: normal, adolf, doge, george, epstein, pepe';