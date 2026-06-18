-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'HRD', 'SUPERVISOR', 'KARYAWAN') NOT NULL,
    `superAdminType` ENUM('DIREKTUR', 'IT_MAINTENANCE') NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `lastActiveAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nik` VARCHAR(191) NOT NULL,
    `namaLengkap` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `noHp` VARCHAR(191) NOT NULL,
    `alamat` TEXT NOT NULL,
    `tanggalLahir` DATETIME(3) NOT NULL,
    `jenisKelamin` ENUM('L', 'P') NOT NULL,
    `statusPernikahan` VARCHAR(191) NOT NULL,
    `fotoUrl` VARCHAR(191) NULL,
    `jabatan` VARCHAR(191) NOT NULL,
    `divisiId` VARCHAR(191) NOT NULL,
    `statusKaryawan` ENUM('TETAP', 'KONTRAK', 'HARIAN') NOT NULL,
    `tanggalMulaiKerja` DATETIME(3) NOT NULL,
    `tanggalAkhirKontrak` DATETIME(3) NULL,
    `nominalUpah` DECIMAL(65, 30) NOT NULL,
    `satuanUpah` ENUM('PER_BULAN', 'PER_JAM') NOT NULL,
    `nominalUpahLembur` DECIMAL(65, 30) NOT NULL,
    `pengaliLembur` DECIMAL(65, 30) NULL,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `employees_userId_key`(`userId`),
    UNIQUE INDEX `employees_nik_key`(`nik`),
    INDEX `employees_divisiId_idx`(`divisiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `divisions` (
    `id` VARCHAR(191) NOT NULL,
    `namaDivisi` VARCHAR(191) NOT NULL,
    `supervisorEmployeeId` VARCHAR(191) NULL,

    UNIQUE INDEX `divisions_namaDivisi_key`(`namaDivisi`),
    UNIQUE INDEX `divisions_supervisorEmployeeId_key`(`supervisorEmployeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `namaProjek` VARCHAR(191) NOT NULL,
    `tanggalMulai` DATETIME(3) NOT NULL,
    `tanggalBerakhir` DATETIME(3) NOT NULL,
    `deskripsi` TEXT NULL,
    `spvProjectEmployeeId` VARCHAR(191) NOT NULL,
    `status` ENUM('AKTIF', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'AKTIF',
    `createdByUserId` VARCHAR(191) NOT NULL,

    INDEX `projects_spvProjectEmployeeId_idx`(`spvProjectEmployeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manpower_requests` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `divisiAsalId` VARCHAR(191) NOT NULL,
    `mode` ENUM('SPESIFIK', 'HEADCOUNT') NOT NULL,
    `employeeId` VARCHAR(191) NULL,
    `jumlahDiminta` INTEGER NULL,
    `kriteria` TEXT NULL,
    `tanggalMulaiPenugasan` DATETIME(3) NOT NULL,
    `tanggalAkhirPenugasan` DATETIME(3) NOT NULL,
    `status` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,

    INDEX `manpower_requests_projectId_idx`(`projectId`),
    INDEX `manpower_requests_divisiAsalId_idx`(`divisiAsalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `manpowerRequestId` VARCHAR(191) NULL,
    `tanggalMulai` DATETIME(3) NOT NULL,
    `tanggalBerakhir` DATETIME(3) NOT NULL,
    `status` ENUM('AKTIF', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'AKTIF',

    INDEX `project_assignments_employeeId_idx`(`employeeId`),
    INDEX `project_assignments_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendances` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `jamMasuk` DATETIME(3) NULL,
    `jamKeluar` DATETIME(3) NULL,
    `namaProjekAktivitas` TEXT NOT NULL,
    `lokasiKerja` ENUM('KANTOR', 'LAINNYA') NOT NULL,
    `lokasiLainnyaDetail` TEXT NULL,
    `latitude` DECIMAL(65, 30) NULL,
    `longitude` DECIMAL(65, 30) NULL,
    `statusKehadiran` ENUM('TEPAT_WAKTU', 'TERLAMBAT', 'ALFA', 'PULANG_CEPAT') NOT NULL,
    `inputByUserId` VARCHAR(191) NULL,
    `deskripsiInputMassal` TEXT NULL,

    INDEX `attendances_tanggal_idx`(`tanggal`),
    UNIQUE INDEX `attendances_employeeId_tanggal_key`(`employeeId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `jenisCuti` ENUM('IZIN', 'CUTI_TAHUNAN', 'SAKIT', 'MELAHIRKAN') NOT NULL,
    `tanggalMulai` DATETIME(3) NOT NULL,
    `tanggalSelesai` DATETIME(3) NOT NULL,
    `alasan` TEXT NOT NULL,
    `dokumenPendukungUrl` TEXT NULL,
    `status` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,

    INDEX `leave_requests_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `overtime_requests` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NULL,
    `jenis` ENUM('INDIVIDUAL', 'MASSAL') NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `deskripsiAlasan` TEXT NOT NULL,
    `status` ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'DICATAT_OTOMATIS') NOT NULL DEFAULT 'DIAJUKAN',
    `inputByUserId` VARCHAR(191) NULL,

    INDEX `overtime_requests_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `overtime_request_members` (
    `id` VARCHAR(191) NOT NULL,
    `overtimeRequestId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `overtime_request_members_overtimeRequestId_employeeId_key`(`overtimeRequestId`, `employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_logs` (
    `id` VARCHAR(191) NOT NULL,
    `jenisPengajuan` ENUM('LEAVE_REQUEST', 'OVERTIME_REQUEST', 'MANPOWER_REQUEST', 'PASSWORD_CHANGE') NOT NULL,
    `referensiId` VARCHAR(191) NOT NULL,
    `aktorUserId` VARCHAR(191) NOT NULL,
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hasil` ENUM('DISETUJUI', 'DITOLAK') NOT NULL,
    `catatan` TEXT NULL,

    INDEX `approval_logs_jenisPengajuan_referensiId_idx`(`jenisPengajuan`, `referensiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `pesan` TEXT NOT NULL,
    `jenis` ENUM('PENGAJUAN', 'STATUS_APPROVAL', 'SISTEM') NOT NULL,
    `referensiId` VARCHAR(191) NULL,
    `sudahDibaca` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_sudahDibaca_idx`(`userId`, `sudahDibaca`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_divisiId_fkey` FOREIGN KEY (`divisiId`) REFERENCES `divisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `divisions` ADD CONSTRAINT `divisions_supervisorEmployeeId_fkey` FOREIGN KEY (`supervisorEmployeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_spvProjectEmployeeId_fkey` FOREIGN KEY (`spvProjectEmployeeId`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manpower_requests` ADD CONSTRAINT `manpower_requests_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manpower_requests` ADD CONSTRAINT `manpower_requests_divisiAsalId_fkey` FOREIGN KEY (`divisiAsalId`) REFERENCES `divisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manpower_requests` ADD CONSTRAINT `manpower_requests_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manpower_requests` ADD CONSTRAINT `manpower_requests_approvedByUserId_fkey` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_assignments` ADD CONSTRAINT `project_assignments_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_assignments` ADD CONSTRAINT `project_assignments_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_assignments` ADD CONSTRAINT `project_assignments_manpowerRequestId_fkey` FOREIGN KEY (`manpowerRequestId`) REFERENCES `manpower_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_inputByUserId_fkey` FOREIGN KEY (`inputByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_approvedByUserId_fkey` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overtime_requests` ADD CONSTRAINT `overtime_requests_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overtime_requests` ADD CONSTRAINT `overtime_requests_inputByUserId_fkey` FOREIGN KEY (`inputByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overtime_request_members` ADD CONSTRAINT `overtime_request_members_overtimeRequestId_fkey` FOREIGN KEY (`overtimeRequestId`) REFERENCES `overtime_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overtime_request_members` ADD CONSTRAINT `overtime_request_members_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_logs` ADD CONSTRAINT `approval_logs_aktorUserId_fkey` FOREIGN KEY (`aktorUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
