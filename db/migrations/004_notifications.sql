-- Migration 004: Notifications et SITE_TITLE

-- Table des notifications
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

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications(created_at DESC);

-- Ajouter SITE_TITLE dans la configuration
INSERT INTO site_config (key, value, value_type, description)
VALUES ('site_title', 'Wisherr', 'string', 'Titre du site affiché dans le navigateur et le footer')
ON CONFLICT (key) DO NOTHING;

-- Ajouter allow_reservation_notifications pour permettre au créateur d'être alerté
INSERT INTO site_config (key, value, value_type, description)
VALUES ('allow_reservation_notifications', 'true', 'boolean', 'Permet aux créateurs de listes de recevoir des notifications de réservation')
ON CONFLICT (key) DO NOTHING;
