-- Photo prompts: allow photos to exist independently of stories (uploaded before interview),
-- link to chapters, and store AI vision analysis for interview prompts.

-- Make story_id nullable so photos can be uploaded before a story exists
ALTER TABLE photos ALTER COLUMN story_id DROP NOT NULL;

-- Add chapter link and AI analysis columns
ALTER TABLE photos ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS chapter_id TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ai_era TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ai_questions JSONB DEFAULT '[]';

-- Index for finding a user's photos (with or without stories)
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_chapter_id ON photos(chapter_id);
