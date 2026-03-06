-- Ensure Appointment.id and related foreign keys use UUID-compatible varchar
SET FOREIGN_KEY_CHECKS=0;

ALTER TABLE `Appointment`
  MODIFY COLUMN `id` VARCHAR(36) NOT NULL;

ALTER TABLE `AppointmentService`
  MODIFY COLUMN `appointmentId` VARCHAR(36) NOT NULL;

ALTER TABLE `AppointmentToken`
  MODIFY COLUMN `appointmentId` VARCHAR(36) NOT NULL;

ALTER TABLE `NotificationLog`
  MODIFY COLUMN `appointmentId` VARCHAR(36) NOT NULL;

SET FOREIGN_KEY_CHECKS=1;
