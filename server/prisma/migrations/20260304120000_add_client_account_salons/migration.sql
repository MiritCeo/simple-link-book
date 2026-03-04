-- CreateTable
CREATE TABLE `ClientAccountSalon` (
    `id` VARCHAR(191) NOT NULL,
    `clientAccountId` VARCHAR(191) NOT NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClientAccountSalon_clientAccountId_salonId_key`(`clientAccountId`, `salonId`),
    UNIQUE INDEX `ClientAccountSalon_clientId_key`(`clientId`),
    INDEX `ClientAccountSalon_clientAccountId_idx`(`clientAccountId`),
    INDEX `ClientAccountSalon_salonId_idx`(`salonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClientAccountSalon` ADD CONSTRAINT `ClientAccountSalon_clientAccountId_fkey` FOREIGN KEY (`clientAccountId`) REFERENCES `ClientAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ClientAccountSalon` ADD CONSTRAINT `ClientAccountSalon_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ClientAccountSalon` ADD CONSTRAINT `ClientAccountSalon_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
