-- CreateTable
CREATE TABLE `SalonGoogleCalendarConnection` (
    `id` VARCHAR(191) NOT NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `googleAccountEmail` VARCHAR(191) NULL,
    `googleCalendarId` VARCHAR(191) NOT NULL,
    `googleCalendarName` VARCHAR(191) NULL,
    `accessToken` TEXT NOT NULL,
    `refreshToken` TEXT NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `syncEnabled` BOOLEAN NOT NULL DEFAULT true,
    `syncHorizonDays` INTEGER NOT NULL DEFAULT 180,
    `lastSyncAt` DATETIME(3) NULL,
    `lastSyncError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalonGoogleCalendarConnection_salonId_key`(`salonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalonGoogleCalendarEvent` (
    `id` VARCHAR(191) NOT NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `appointmentId` VARCHAR(191) NOT NULL,
    `googleEventId` VARCHAR(191) NOT NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalonGoogleCalendarEvent_appointmentId_key`(`appointmentId`),
    UNIQUE INDEX `SalonGoogleCalendarEvent_salonId_googleEventId_key`(`salonId`, `googleEventId`),
    INDEX `SalonGoogleCalendarEvent_salonId_idx`(`salonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SalonGoogleCalendarConnection` ADD CONSTRAINT `SalonGoogleCalendarConnection_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalonGoogleCalendarEvent` ADD CONSTRAINT `SalonGoogleCalendarEvent_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalonGoogleCalendarEvent` ADD CONSTRAINT `SalonGoogleCalendarEvent_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
