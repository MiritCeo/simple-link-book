-- CreateTable
CREATE TABLE `SalonFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `category` ENUM('BUG', 'UX', 'FEATURE', 'INTEGRATION', 'NOTIFICATIONS', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('NEW', 'UNDER_REVIEW', 'IN_VOTING', 'PLANNED', 'DONE', 'DECLINED') NOT NULL DEFAULT 'NEW',
    `votingOpenedAt` DATETIME(3) NULL,
    `adminNote` TEXT NULL,
    `publicReply` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SalonFeedback_salonId_idx`(`salonId`),
    INDEX `SalonFeedback_status_idx`(`status`),
    INDEX `SalonFeedback_votingOpenedAt_idx`(`votingOpenedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalonFeedbackVote` (
    `id` VARCHAR(191) NOT NULL,
    `feedbackId` VARCHAR(191) NOT NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SalonFeedbackVote_salonId_idx`(`salonId`),
    UNIQUE INDEX `SalonFeedbackVote_feedbackId_salonId_key`(`feedbackId`, `salonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SalonFeedback` ADD CONSTRAINT `SalonFeedback_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalonFeedback` ADD CONSTRAINT `SalonFeedback_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalonFeedbackVote` ADD CONSTRAINT `SalonFeedbackVote_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `SalonFeedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalonFeedbackVote` ADD CONSTRAINT `SalonFeedbackVote_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
