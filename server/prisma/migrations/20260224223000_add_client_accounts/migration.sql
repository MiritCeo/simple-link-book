-- CreateTable
CREATE TABLE `ClientAccount` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clientId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ClientAccount_email_key`(`email`),
    UNIQUE INDEX `ClientAccount_clientId_key`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientPasswordReset` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clientAccountId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ClientPasswordReset_token_key`(`token`),
    INDEX `ClientPasswordReset_clientAccountId_idx`(`clientAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClientAccount` ADD CONSTRAINT `ClientAccount_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientPasswordReset` ADD CONSTRAINT `ClientPasswordReset_clientAccountId_fkey` FOREIGN KEY (`clientAccountId`) REFERENCES `ClientAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
