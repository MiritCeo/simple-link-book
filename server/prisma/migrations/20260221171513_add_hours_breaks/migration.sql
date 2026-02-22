-- CreateTable
CREATE TABLE `SalonHour` (
    `id` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `open` VARCHAR(191) NOT NULL,
    `close` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `salonId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `SalonHour_salonId_weekday_key`(`salonId`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalonException` (
    `id` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `start` VARCHAR(191) NULL,
    `end` VARCHAR(191) NULL,
    `closed` BOOLEAN NOT NULL DEFAULT false,
    `salonId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalonBreak` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('BREAK', 'BUFFER') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `days` VARCHAR(191) NULL,
    `start` VARCHAR(191) NULL,
    `end` VARCHAR(191) NULL,
    `minutes` INTEGER NULL,
    `salonId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SalonHour` ADD CONSTRAINT `SalonHour_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalonException` ADD CONSTRAINT `SalonException_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalonBreak` ADD CONSTRAINT `SalonBreak_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
