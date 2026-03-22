-- CreateTable
CREATE TABLE `ClientRegistrationSession` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `phoneDigits` VARCHAR(191) NULL,
    `codeHash` VARCHAR(191) NULL,
    `codeExpiresAt` DATETIME(3) NULL,
    `codeAttempts` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClientRegistrationSession_sessionToken_key`(`sessionToken`),
    INDEX `ClientRegistrationSession_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
