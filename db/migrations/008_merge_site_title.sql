-- Migration 008: Merge site_name into site_title
-- Supprimer la redondance entre site_name et site_title

-- Si site_title n'existe pas encore, le créer avec la valeur de site_name
INSERT INTO site_config (key, value, value_type, description)
SELECT 'site_title', 
       COALESCE((SELECT value FROM site_config WHERE key = 'site_name'), 'Wisherr'),
       'string', 
       'Titre du site affiché dans le navigateur et le footer'
WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE key = 'site_title');

-- Supprimer site_name (redondant avec site_title)
DELETE FROM site_config WHERE key = 'site_name';
