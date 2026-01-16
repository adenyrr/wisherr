-- Migration: Add theme preference to users table
-- Date: 2025-01-26

-- Add theme column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(16) DEFAULT 'dark';

-- Update existing users to have default theme
UPDATE users SET theme = 'dark' WHERE theme IS NULL;
