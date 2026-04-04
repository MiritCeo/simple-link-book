-- AlterTable
ALTER TABLE `ClientAccount` ADD COLUMN `privacyPolicyAcceptedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `ClientRegistrationSession` ADD COLUMN `privacyAcceptedAt` DATETIME(3) NULL;
