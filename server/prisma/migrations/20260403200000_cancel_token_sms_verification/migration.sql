ALTER TABLE `AppointmentToken`
  ADD COLUMN `verificationCodeHash` VARCHAR(191) NULL,
  ADD COLUMN `verificationCodeExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `verificationCodeAttempts` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `verificationCodeSentAt` DATETIME(3) NULL;
