-- Schéma principal Wisherr (PostgreSQL)
-- Synchronisé avec backend/app/models.py
-- Version: 2026-01-17

-- =====================================================
-- UTILISATEURS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    oidc_sub VARCHAR(255),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    locale VARCHAR(8) DEFAULT 'fr',
    theme VARCHAR(16) DEFAULT 'dark'
);

CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

-- =====================================================
-- TOKENS BLACKLISTÉS
-- =====================================================

CREATE TABLE IF NOT EXISTS blacklisted_tokens (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    blacklisted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- GROUPES ET MEMBRES
-- =====================================================

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_groups_owner_id ON groups(owner_id);

CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    added_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS ix_group_members_user_id ON group_members(user_id);

-- =====================================================
-- LISTES DE SOUHAITS
-- =====================================================

CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    share_password_hash TEXT,
    occasion VARCHAR(64),
    event_date DATE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    cover_color VARCHAR(7) DEFAULT '#6366f1',
    notify_owner_on_reservation BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_wishlists_owner_id ON wishlists(owner_id);

-- =====================================================
-- COLLABORATEURS DE LISTE
-- =====================================================

CREATE TABLE IF NOT EXISTS wishlist_collaborators (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_wishlist_collaborators_wishlist_id ON wishlist_collaborators(wishlist_id);
CREATE INDEX IF NOT EXISTS ix_wishlist_collaborators_user_id ON wishlist_collaborators(user_id);

-- =====================================================
-- PARTAGES AVANCÉS
-- =====================================================

CREATE TABLE IF NOT EXISTS wishlist_shares (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    share_type VARCHAR(16) NOT NULL,  -- internal, external
    target_group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(16) DEFAULT 'viewer',  -- viewer, editor
    share_token VARCHAR(64) UNIQUE,
    share_password_hash TEXT,
    notify_on_reservation BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_wishlist_shares_wishlist_id ON wishlist_shares(wishlist_id);

-- =====================================================
-- CATÉGORIES ET PRIORITÉS
-- =====================================================

CREATE TABLE IF NOT EXISTS item_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(32) DEFAULT 'tag',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_item_categories_user_id ON item_categories(user_id);

CREATE TABLE IF NOT EXISTS item_priorities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(32) NOT NULL,
    level INTEGER NOT NULL,
    color VARCHAR(7) NOT NULL,
    icon VARCHAR(32)
);

-- =====================================================
-- ARTICLES
-- =====================================================

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    url TEXT,
    image_url TEXT,
    description TEXT,
    price NUMERIC(10,2),
    category_id INTEGER REFERENCES item_categories(id) ON DELETE SET NULL,
    priority_id INTEGER REFERENCES item_priorities(id) ON DELETE SET NULL,
    status VARCHAR(16) DEFAULT 'available',  -- available, reserved, purchased
    custom_attributes JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    reserved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reserved_by_name VARCHAR(128),
    reserved_at TIMESTAMP,
    purchased_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_items_wishlist_id ON items(wishlist_id);

-- =====================================================
-- RÉSERVATIONS (legacy)
-- =====================================================

CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    reserver_name VARCHAR(128),
    reserver_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reserved_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notify_giver BOOLEAN NOT NULL DEFAULT FALSE,
    notify_owner BOOLEAN NOT NULL DEFAULT TRUE,
    is_surprise BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_reservations_item_id ON reservations(item_id);

-- =====================================================
-- ACTIVITÉS (FEED)
-- =====================================================

CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(32) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id INTEGER,
    target_name VARCHAR(256),
    extra_data JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    wishlist_id INTEGER REFERENCES wishlists(id) ON DELETE SET NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_activities_user_id ON activities(user_id);

-- =====================================================
-- CONFIGURATION DU SITE (ADMIN)
-- =====================================================

CREATE TABLE IF NOT EXISTS site_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(64) NOT NULL UNIQUE,
    value TEXT,
    value_type VARCHAR(16) DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- ERREURS INTERNES (ADMIN)
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

-- =====================================================
-- INVITATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(128) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_invitations_wishlist_id ON invitations(wishlist_id);

-- =====================================================
-- AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(256) NOT NULL,
    message TEXT,
    icon VARCHAR(32) DEFAULT 'bell',
    color VARCHAR(7) DEFAULT '#6366f1',
    link VARCHAR(512),
    target_type VARCHAR(32),
    target_id INTEGER,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);

-- =====================================================
-- DONNÉES INITIALES (optionnel)
-- =====================================================

-- Priorités par défaut
INSERT INTO item_priorities (name, level, color, icon) VALUES
    ('Basse', 1, '#22c55e', 'arrow-down'),
    ('Normale', 2, '#6366f1', 'minus'),
    ('Haute', 3, '#f59e0b', 'arrow-up'),
    ('Urgente', 4, '#ef4444', 'exclamation')
ON CONFLICT DO NOTHING;
