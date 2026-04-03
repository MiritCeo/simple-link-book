-- Uzupełnia brakujące kolumny używane przez logikę usuwania klienta i audyt ruchów magazynowych.
ALTER TABLE `InventoryMovement`
  ADD COLUMN `usageType` VARCHAR(191) NULL,
  ADD COLUMN `clientId` VARCHAR(191) NULL;

CREATE INDEX `InventoryMovement_clientId_idx` ON `InventoryMovement`(`clientId`);

ALTER TABLE `InventoryMovement`
  ADD CONSTRAINT `InventoryMovement_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
