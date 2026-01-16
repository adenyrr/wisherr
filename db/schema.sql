-- Schéma principal Wisherr (PostgreSQL)

-- Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    oidc_sub VARCHAR(255),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    locale VARCHAR(8) DEFAULT 'fr'
);

-- Table des listes de souhaits
CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    share_password_hash TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des collaborateurs de liste
CREATE TABLE wishlist_collaborators (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMP
);

-- Table des articles
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    url TEXT,
    image_url TEXT,
    description TEXT,
    is_second_hand BOOLEAN NOT NULL DEFAULT FALSE,
    price NUMERIC(10,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des réservations
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    reserver_name VARCHAR(128),
    reserver_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reserved_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notify_giver BOOLEAN NOT NULL DEFAULT FALSE,
    notify_owner BOOLEAN NOT NULL DEFAULT TRUE,
    is_surprise BOOLEAN NOT NULL DEFAULT TRUE
);

-- Table des invitations
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(128) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP
);

-- Table d’audit log
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insérer l'utilisateur admin
INSERT INTO users (username, email, password_hash, is_admin) VALUES ('plop', 'plop@plop.be', '$argon2id$v=19$m=65536,t=3,p=4$MUZI6b2XkpJyDuF87z1nLA$s3ZvEiCNfTBIyVy2HnCt7fHsT7gnjAp18vw9XcdEIFU', true);
