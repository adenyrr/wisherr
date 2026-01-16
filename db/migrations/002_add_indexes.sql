-- Migration 002: Ajout d'index pour optimiser les performances
-- Date: 2026-01-16

-- Index sur la table users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_oidc_sub ON users(oidc_sub) WHERE oidc_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Index sur la table wishlists
CREATE INDEX IF NOT EXISTS idx_wishlists_owner ON wishlists(owner_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_public ON wishlists(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON wishlists(created_at DESC);

-- Index sur la table wishlist_collaborators
CREATE INDEX IF NOT EXISTS idx_collaborators_wishlist ON wishlist_collaborators(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON wishlist_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_role ON wishlist_collaborators(wishlist_id, role);

-- Index sur la table items
CREATE INDEX IF NOT EXISTS idx_items_wishlist ON items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

-- Index sur la table reservations (si existe)
-- CREATE INDEX IF NOT EXISTS idx_reservations_item ON reservations(item_id);
-- CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);

-- Index composites pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_wishlists_owner_created ON wishlists(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_wishlist_created ON items(wishlist_id, created_at DESC);

COMMENT ON INDEX idx_users_email IS 'Index pour recherche rapide par email lors de login/register';
COMMENT ON INDEX idx_wishlists_public IS 'Index composite pour lister wishlists publiques triées par date';
COMMENT ON INDEX idx_items_wishlist IS 'Index pour charger tous les items d''une wishlist';
