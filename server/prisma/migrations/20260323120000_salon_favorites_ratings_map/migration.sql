-- AlterTable
ALTER TABLE `Salon` ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL;

-- CreateTable
CREATE TABLE `SalonRating` (
    `id` VARCHAR(191) NOT NULL,
    `appointmentId` VARCHAR(191) NOT NULL,
    `clientAccountId` VARCHAR(191) NOT NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `stars` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SalonRating_appointmentId_key`(`appointmentId`),
    INDEX `SalonRating_salonId_idx`(`salonId`),
    INDEX `SalonRating_clientAccountId_idx`(`clientAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientFavoriteSalon` (
    `id` VARCHAR(191) NOT NULL,
    `clientAccountId` VARCHAR(191) NOT NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClientFavoriteSalon_clientAccountId_salonId_key`(`clientAccountId`, `salonId`),
    INDEX `ClientFavoriteSalon_clientAccountId_idx`(`clientAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientFavoriteGooglePlace` (
    `id` VARCHAR(191) NOT NULL,
    `clientAccountId` VARCHAR(191) NOT NULL,
    `googlePlaceId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `displayAddress` TEXT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClientFavoriteGooglePlace_clientAccountId_googlePlaceId_key`(`clientAccountId`, `googlePlaceId`),
    INDEX `ClientFavoriteGooglePlace_clientAccountId_idx`(`clientAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SalonRating` ADD CONSTRAINT `SalonRating_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalonRating` ADD CONSTRAINT `SalonRating_clientAccountId_fkey` FOREIGN KEY (`clientAccountId`) REFERENCES `ClientAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalonRating` ADD CONSTRAINT `SalonRating_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientFavoriteSalon` ADD CONSTRAINT `ClientFavoriteSalon_clientAccountId_fkey` FOREIGN KEY (`clientAccountId`) REFERENCES `ClientAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientFavoriteSalon` ADD CONSTRAINT `ClientFavoriteSalon_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientFavoriteGooglePlace` ADD CONSTRAINT `ClientFavoriteGooglePlace_clientAccountId_fkey` FOREIGN KEY (`clientAccountId`) REFERENCES `ClientAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
