-- Migration: Ajout de l'option de notification pour les partages externes
-- Date: 2026-01-16

-- Ajouter la colonne notify_on_reservation à wishlist_shares
ALTER TABLE wishlist_shares 
ADD COLUMN IF NOT EXISTS notify_on_reservation BOOLEAN NOT NULL DEFAULT FALSE;

-- Commentaire
COMMENT ON COLUMN wishlist_shares.notify_on_reservation IS 'Notifier le propriétaire lors des réservations via ce partage';
