-- CreateTable
CREATE TABLE `employee_promotions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `jenisPromosi` ENUM('HARIAN_KE_KONTRAK', 'KONTRAK_KE_TETAP', 'PERUBAHAN_GAJI') NOT NULL,
    `statusBaru` ENUM('TETAP', 'KONTRAK', 'HARIAN') NOT NULL,
    `nominalUpahBaru` DECIMAL(65, 30) NOT NULL,
    `satuanUpahBaru` ENUM('PER_BULAN', 'PER_JAM') NOT NULL,
    `nominalUpahLemburBaru` DECIMAL(65, 30) NOT NULL,
    `pengaliLemburBaru` DECIMAL(65, 30) NULL,
    `tanggalMulai` DATETIME(3) NOT NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `status` ENUM('DIJADWALKAN', 'AKTIF', 'DIBATALKAN') NOT NULL DEFAULT 'DIJADWALKAN',
    `diprosesOlehUserId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `appliedAt` DATETIME(3) NULL,

    INDEX `employee_promotions_employeeId_idx`(`employeeId`),
    INDEX `employee_promotions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employee_promotions` ADD CONSTRAINT `employee_promotions_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_promotions` ADD CONSTRAINT `employee_promotions_diprosesOlehUserId_fkey` FOREIGN KEY (`diprosesOlehUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
