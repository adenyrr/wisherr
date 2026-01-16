-- Migration: Add notify_owner_on_reservation column to wishlists table
-- Date: 2026-01-16

-- Add column to control if owner is notified when someone reserves an item
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS notify_owner_on_reservation BOOLEAN DEFAULT true;

-- Update existing wishlists to have default value
UPDATE wishlists SET notify_owner_on_reservation = true WHERE notify_owner_on_reservation IS NULL;
