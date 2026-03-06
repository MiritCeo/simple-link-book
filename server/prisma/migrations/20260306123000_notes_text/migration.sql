-- Expand notes fields to TEXT to avoid truncation
ALTER TABLE `Client` MODIFY COLUMN `notes` TEXT NULL;
ALTER TABLE `Appointment` MODIFY COLUMN `notes` TEXT NULL;
