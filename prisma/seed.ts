import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const db = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const elektrik = await db.division.upsert({
    where: { namaDivisi: 'Elektrik' },
    update: {},
    create: { namaDivisi: 'Elektrik' },
  });

  const hrdDivisi = await db.division.upsert({
    where: { namaDivisi: 'HRD' },
    update: {},
    create: { namaDivisi: 'HRD' },
  });

  // Super Admin — Direktur (wewenang approval penuh, tanpa profil Employee)
  await db.user.upsert({
    where: { username: 'admin1' },
    update: {},
    create: {
      username: 'admin1',
      passwordHash,
      role: 'SUPER_ADMIN',
      superAdminType: 'DIREKTUR',
    },
  });

  // Super Admin — IT/Maintenance (akses teknis penuh, TAPI diblokir dari approve/reject)
  await db.user.upsert({
    where: { username: 'itmaint1' },
    update: {},
    create: {
      username: 'itmaint1',
      passwordHash,
      role: 'SUPER_ADMIN',
      superAdminType: 'IT_MAINTENANCE',
    },
  });

  // HRD — Siti Rahma
  const hrdUser = await db.user.upsert({
    where: { username: 'hrd1' },
    update: {},
    create: { username: 'hrd1', passwordHash, role: 'HRD' },
  });
  await db.employee.upsert({
    where: { nik: '199001012023001' },
    update: {},
    create: {
      userId: hrdUser.id,
      nik: '199001012023001',
      namaLengkap: 'Siti Rahma',
      email: 'siti.rahma@mitrakarya.co.id',
      noHp: '0811-1111-1111',
      alamat: 'Jakarta',
      tanggalLahir: new Date('1990-01-01'),
      jenisKelamin: 'P',
      statusPernikahan: 'Menikah',
      jabatan: 'Staff HRD',
      divisiId: hrdDivisi.id,
      statusKaryawan: 'TETAP',
      tanggalMulaiKerja: new Date('2023-01-01'),
      nominalUpah: 7000000,
      satuanUpah: 'PER_BULAN',
      nominalUpahLembur: 80000,
    },
  });

  // Supervisor — Andi Wijaya (sekaligus jadi supervisor Divisi Elektrik)
  const spvUser = await db.user.upsert({
    where: { username: 'spv1' },
    update: {},
    create: { username: 'spv1', passwordHash, role: 'SUPERVISOR' },
  });
  const andi = await db.employee.upsert({
    where: { nik: '199107032015001' },
    update: {},
    create: {
      userId: spvUser.id,
      nik: '199107032015001',
      namaLengkap: 'Andi Wijaya',
      email: 'andi.wijaya@mitrakarya.co.id',
      noHp: '0812-2222-2222',
      alamat: 'Bekasi',
      tanggalLahir: new Date('1991-07-03'),
      jenisKelamin: 'L',
      statusPernikahan: 'Menikah',
      jabatan: 'SPV Elektrik',
      divisiId: elektrik.id,
      statusKaryawan: 'TETAP',
      tanggalMulaiKerja: new Date('2015-03-01'),
      nominalUpah: 8500000,
      satuanUpah: 'PER_BULAN',
      nominalUpahLembur: 90000,
    },
  });
  await db.division.update({ where: { id: elektrik.id }, data: { supervisorEmployeeId: andi.id } });

  // Karyawan — Budi Santoso
  const karyawanUser = await db.user.upsert({
    where: { username: 'karyawan1' },
    update: {},
    create: { username: 'karyawan1', passwordHash, role: 'KARYAWAN' },
  });
  await db.employee.upsert({
    where: { nik: '198502142014001' },
    update: {},
    create: {
      userId: karyawanUser.id,
      nik: '198502142014001',
      namaLengkap: 'Budi Santoso',
      email: 'budi.santoso@mitrakarya.co.id',
      noHp: '0812-3456-7890',
      alamat: 'Jl. Kenanga No. 12, Bekasi',
      tanggalLahir: new Date('1985-02-14'),
      jenisKelamin: 'L',
      statusPernikahan: 'Menikah',
      jabatan: 'Teknisi Elektrik',
      divisiId: elektrik.id,
      statusKaryawan: 'TETAP',
      tanggalMulaiKerja: new Date('2014-03-03'),
      nominalUpah: 6200000,
      satuanUpah: 'PER_BULAN',
      nominalUpahLembur: 75000,
    },
  });

  console.log('Seed selesai. Semua akun memakai password:', DEFAULT_PASSWORD);
  console.log('- admin1     (SUPER_ADMIN / Direktur)');
  console.log('- itmaint1   (SUPER_ADMIN / IT-Maintenance — diblokir dari approve/reject)');
  console.log('- hrd1       (HRD — Siti Rahma)');
  console.log('- spv1       (SUPERVISOR — Andi Wijaya, supervisor Divisi Elektrik)');
  console.log('- karyawan1  (KARYAWAN — Budi Santoso, Divisi Elektrik)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
