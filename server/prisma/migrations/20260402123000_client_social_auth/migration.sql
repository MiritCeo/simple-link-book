-- Add social auth columns to client accounts
ALTER TABLE `ClientAccount`
  ADD COLUMN `socialProvider` ENUM('GOOGLE', 'APPLE') NULL,
  ADD COLUMN `socialUserId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `ClientAccount_socialProvider_socialUserId_key`
  ON `ClientAccount`(`socialProvider`, `socialUserId`);

-- Store temporary phone verification codes for social sign-up flow
CREATE TABLE `ClientSocialVerificationCode` (
  `id` VARCHAR(191) NOT NULL,
  `phoneDigits` VARCHAR(191) NOT NULL,
  `codeHash` VARCHAR(191) NOT NULL,
  `codeExpiresAt` DATETIME(3) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ClientSocialVerificationCode_phoneDigits_key`(`phoneDigits`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
