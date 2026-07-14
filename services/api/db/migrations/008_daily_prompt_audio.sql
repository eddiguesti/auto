-- Retain the private R2 recording associated with a completed daily prompt.

ALTER TABLE daily_prompts ADD COLUMN IF NOT EXISTS audio_url TEXT;
