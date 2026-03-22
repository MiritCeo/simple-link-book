-- Współrzędne środka Warszawy (mapa klienta ignoruje salony bez lat/lng)
UPDATE `Salon`
SET `latitude` = 52.2297, `longitude` = 21.0122
WHERE `slug` = 'studio-bella' AND (`latitude` IS NULL OR `longitude` IS NULL);
