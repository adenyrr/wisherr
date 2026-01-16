-- Migration 003: Fonctionnalités complètes Wisherr
-- Groupes, partages avancés, catégories, priorités, activités, configuration

-- =====================================================
-- GROUPES ET MEMBRES
-- =====================================================

-- Table des groupes (famille, amis, etc.)
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des membres de groupe
CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(group_id, user_id)
);

-- =====================================================
-- PARTAGES AVANCÉS
-- =====================================================

-- Table des partages de listes (interne = vers groupe/user, externe = lien public)
CREATE TABLE IF NOT EXISTS wishlist_shares (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    -- Partage interne (vers groupe ou utilisateur)
    share_type VARCHAR(16) NOT NULL CHECK (share_type IN ('internal', 'external')),
    target_group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    -- Permissions (viewer = lecture seule + réservation, editor = édition complète)
    permission VARCHAR(16) NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor')),
    -- Partage externe
    share_token VARCHAR(64) UNIQUE,
    share_password_hash TEXT,
    -- Métadonnées
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Index pour recherche rapide des partages
CREATE INDEX IF NOT EXISTS idx_wishlist_shares_wishlist ON wishlist_shares(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_shares_token ON wishlist_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_wishlist_shares_group ON wishlist_shares(target_group_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_shares_user ON wishlist_shares(target_user_id);

-- =====================================================
-- CATÉGORIES ET PRIORITÉS D'ARTICLES
-- =====================================================

-- Table des catégories (définies par l'utilisateur)
CREATE TABLE IF NOT EXISTS item_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(32) DEFAULT 'tag',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Valeurs par défaut pour les priorités
CREATE TABLE IF NOT EXISTS item_priorities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(32) NOT NULL,
    level INTEGER NOT NULL,
    color VARCHAR(7) NOT NULL,
    icon VARCHAR(32)
);

-- Insérer les priorités par défaut
INSERT INTO item_priorities (name, level, color, icon) VALUES 
    ('Indispensable', 1, '#ef4444', 'alert-circle'),
    ('Très souhaité', 2, '#f97316', 'star'),
    ('Souhaité', 3, '#eab308', 'heart'),
    ('Si possible', 4, '#22c55e', 'thumbs-up'),
    ('Optionnel', 5, '#6b7280', 'minus')
ON CONFLICT DO NOTHING;

-- =====================================================
-- ENRICHISSEMENT DES ARTICLES
-- =====================================================

-- Ajouter colonnes aux articles
ALTER TABLE items ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES item_categories(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS priority_id INTEGER REFERENCES item_priorities(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS status VARCHAR(16) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'purchased'));
ALTER TABLE items ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}';
ALTER TABLE items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE items ADD COLUMN IF NOT EXISTS reserved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS reserved_by_name VARCHAR(128);
ALTER TABLE items ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP;
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP;

-- =====================================================
-- ENRICHISSEMENT DES LISTES
-- =====================================================

-- Ajouter colonnes aux listes
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS occasion VARCHAR(64);
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS cover_color VARCHAR(7) DEFAULT '#6366f1';

-- =====================================================
-- JOURNAL D'ACTIVITÉ
-- =====================================================

-- Table des activités (feed)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(32) NOT NULL,
    -- Types: list_created, list_updated, list_shared, item_added, item_updated, 
    -- item_reserved, item_purchased, item_deleted, group_created, member_added, etc.
    target_type VARCHAR(32) NOT NULL, -- wishlist, item, group, user, share
    target_id INTEGER,
    target_name VARCHAR(256),
    extra_data JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    -- Pour les activités sur les listes partagées, stocker le contexte
    wishlist_id INTEGER REFERENCES wishlists(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_wishlist ON activities(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

-- =====================================================
-- CONFIGURATION DU SITE (ADMIN)
-- =====================================================

CREATE TABLE IF NOT EXISTS site_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(64) NOT NULL UNIQUE,
    value TEXT,
    value_type VARCHAR(16) DEFAULT 'string' CHECK (value_type IN ('string', 'boolean', 'number', 'json')),
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Configuration par défaut
INSERT INTO site_config (key, value, value_type, description) VALUES
    ('site_name', 'Wisherr', 'string', 'Nom du site'),
    ('default_theme', 'dark', 'string', 'Thème par défaut (light/dark)'),
    ('default_locale', 'fr', 'string', 'Langue par défaut'),
    ('allow_registration', 'true', 'boolean', 'Autoriser les inscriptions'),
    ('external_share_base_url', '', 'string', 'URL de base pour les partages externes'),
    ('oidc_enabled', 'false', 'boolean', 'Activer l''authentification OIDC'),
    ('oidc_provider_url', '', 'string', 'URL du fournisseur OIDC'),
    ('oidc_client_id', '', 'string', 'Client ID OIDC'),
    ('max_lists_per_user', '50', 'number', 'Nombre max de listes par utilisateur'),
    ('max_items_per_list', '200', 'number', 'Nombre max d''articles par liste')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- ERREURS INTERNES (POUR ADMIN)
-- =====================================================

CREATE TABLE IF NOT EXISTS internal_errors (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    request_path VARCHAR(256),
    request_method VARCHAR(16),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_internal_errors_created ON internal_errors(created_at DESC);

-- =====================================================
-- STATISTIQUES UTILISATEUR
-- =====================================================

-- Vue pour les stats utilisateur (calculée dynamiquement)
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(DISTINCT w.id) as total_lists,
    COUNT(DISTINCT i.id) as total_items,
    COUNT(DISTINCT g.id) as total_groups,
    COUNT(DISTINCT ws.id) as total_shares,
    COUNT(DISTINCT CASE WHEN i.status = 'reserved' THEN i.id END) as items_reserved,
    COUNT(DISTINCT CASE WHEN i.status = 'purchased' THEN i.id END) as items_purchased
FROM users u
LEFT JOIN wishlists w ON w.owner_id = u.id
LEFT JOIN items i ON i.wishlist_id = w.id
LEFT JOIN groups g ON g.owner_id = u.id
LEFT JOIN wishlist_shares ws ON ws.created_by = u.id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username;

-- =====================================================
-- INDEX SUPPLÉMENTAIRES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_priority ON items(priority_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_occasion ON wishlists(occasion);
