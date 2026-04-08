-- InventoryCategory + optional categoryId on InventoryItem (schema was ahead of migrations)
CREATE TABLE `InventoryCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `salonId` VARCHAR(191) NOT NULL,

    INDEX `InventoryCategory_salonId_idx`(`salonId`),
    INDEX `InventoryCategory_parentId_idx`(`parentId`),
    UNIQUE INDEX `InventoryCategory_salonId_name_parentId_key`(`salonId`, `name`, `parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `InventoryCategory`
  ADD CONSTRAINT `InventoryCategory_salonId_fkey`
    FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InventoryCategory`
  ADD CONSTRAINT `InventoryCategory_parentId_fkey`
    FOREIGN KEY (`parentId`) REFERENCES `InventoryCategory`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `InventoryItem`
  ADD COLUMN `categoryId` VARCHAR(191) NULL;

CREATE INDEX `InventoryItem_categoryId_idx` ON `InventoryItem`(`categoryId`);

ALTER TABLE `InventoryItem`
  ADD CONSTRAINT `InventoryItem_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `InventoryCategory`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
