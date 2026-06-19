-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jamMasukStandar` VARCHAR(191) NOT NULL DEFAULT '08:00',
    `jamPulangStandar` VARCHAR(191) NOT NULL DEFAULT '17:00',
    `batasTerlambat` VARCHAR(191) NOT NULL DEFAULT '08:00',
    `batasAlfa` VARCHAR(191) NOT NULL DEFAULT '12:00',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
