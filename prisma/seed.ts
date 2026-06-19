import {
  PrismaClient,
  Role,
  StatusKaryawan,
  SatuanUpah,
  JenisKelamin,
  JenisCuti,
  LeaveStatus,
  OvertimeJenis,
  OvertimeStatus,
  ManpowerMode,
  ManpowerStatus,
  AssignmentStatus,
  ProjectStatus,
  StatusKehadiran,
  NotifJenis,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const db = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';

// ---------------------------------------------------------------------------
// Helper tanggal
// ---------------------------------------------------------------------------
function d(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function dt(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}:00.000Z`);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, n: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

// ---------------------------------------------------------------------------
// 1. Bersihkan seluruh data transaksional/flow supaya skrip ini aman dijalankan
//    berulang kali (idempotent) — User/Employee/Division TIDAK dihapus, hanya
//    di-upsert, supaya akun login & ID yang sudah dipakai tetap stabil.
//    Urutan hapus mengikuti arah foreign key (anak dulu, baru induk).
// ---------------------------------------------------------------------------
async function clearTransactionalData() {
  await db.approvalLog.deleteMany({});
  await db.notification.deleteMany({});
  await db.overtimeRequestMember.deleteMany({});
  await db.overtimeRequest.deleteMany({});
  await db.projectAssignment.deleteMany({});
  await db.manpowerRequest.deleteMany({});
  await db.attendance.deleteMany({});
  await db.leaveRequest.deleteMany({});
  await db.project.deleteMany({});
}

// ---------------------------------------------------------------------------
// 2. Divisi
// ---------------------------------------------------------------------------
const DIVISION_NAMES = ['Elektrik', 'QC', 'Produksi', 'Marketing', 'Gudang', 'HRD'] as const;
type DivisionKey = (typeof DIVISION_NAMES)[number];

async function seedDivisions(): Promise<Record<DivisionKey, { id: number }>> {
  const result: Partial<Record<DivisionKey, { id: number }>> = {};
  for (const nama of DIVISION_NAMES) {
    result[nama] = await db.division.upsert({
      where: { namaDivisi: nama },
      update: {},
      create: { namaDivisi: nama },
    });
  }
  return result as Record<DivisionKey, { id: number }>;
}

// ---------------------------------------------------------------------------
// 3. Roster orang (User + Employee). Super Admin tidak punya Employee.
// ---------------------------------------------------------------------------
interface PersonSpec {
  username: string;
  namaLengkap: string;
  role: Role;
  superAdminType?: 'DIREKTUR' | 'IT_MAINTENANCE';
  jabatan?: string;
  divisi?: DivisionKey;
  statusKaryawan?: StatusKaryawan;
  satuanUpah?: SatuanUpah;
  nominalUpah?: number;
  nominalUpahLembur?: number;
  pengaliLembur?: number;
  nik?: string;
  email?: string;
  noHp?: string;
  alamat?: string;
  tanggalLahir?: string;
  jenisKelamin?: JenisKelamin;
  statusPernikahan?: string;
  tanggalMulaiKerja?: string;
  tanggalAkhirKontrak?: string;
  isDivisionSupervisor?: boolean;
}

const ROSTER: PersonSpec[] = [
  // ----- Super Admin (tanpa profil Employee) -----
  { username: 'admin1', namaLengkap: 'Hartono', role: 'SUPER_ADMIN', superAdminType: 'DIREKTUR' },
  { username: 'itmaint1', namaLengkap: 'Joko Prasetyo', role: 'SUPER_ADMIN', superAdminType: 'IT_MAINTENANCE' },

  // ----- HRD -----
  {
    username: 'hrd1', namaLengkap: 'Siti Rahma', role: 'HRD', jabatan: 'Staff HRD', divisi: 'HRD',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 7000000, nominalUpahLembur: 80000,
    nik: '199001012023001', email: 'siti.rahma@mitrakarya.co.id', noHp: '0811-1111-1111',
    alamat: 'Jl. Melati No. 5, Jakarta Selatan', tanggalLahir: '1990-01-01', jenisKelamin: 'P',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2023-01-01',
  },
  {
    username: 'hrd2', namaLengkap: 'Maria Christanti', role: 'HRD', jabatan: 'Staff HRD', divisi: 'HRD',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 6800000, nominalUpahLembur: 78000,
    nik: '199306152024002', email: 'maria.christanti@mitrakarya.co.id', noHp: '0811-2222-3333',
    alamat: 'Jl. Anggrek No. 9, Jakarta Selatan', tanggalLahir: '1993-06-15', jenisKelamin: 'P',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2024-02-01',
  },

  // ----- Supervisor per divisi -----
  {
    username: 'spv1', namaLengkap: 'Andi Wijaya', role: 'SUPERVISOR', jabatan: 'SPV Elektrik', divisi: 'Elektrik',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 8500000, nominalUpahLembur: 90000,
    nik: '199107032015001', email: 'andi.wijaya@mitrakarya.co.id', noHp: '0812-2222-2222',
    alamat: 'Jl. Kenanga No. 3, Bekasi', tanggalLahir: '1991-07-03', jenisKelamin: 'L',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2015-03-01', isDivisionSupervisor: true,
  },
  {
    username: 'spv2', namaLengkap: 'Bambang Sutrisno', role: 'SUPERVISOR', jabatan: 'SPV QC', divisi: 'QC',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 8200000, nominalUpahLembur: 88000,
    nik: '198912202014003', email: 'bambang.sutrisno@mitrakarya.co.id', noHp: '0812-3333-1111',
    alamat: 'Jl. Cempaka No. 7, Bekasi', tanggalLahir: '1989-12-20', jenisKelamin: 'L',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2014-05-10', isDivisionSupervisor: true,
  },
  {
    username: 'spv3', namaLengkap: 'Slamet Riyadi', role: 'SUPERVISOR', jabatan: 'SPV Produksi', divisi: 'Produksi',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 8300000, nominalUpahLembur: 89000,
    nik: '198803152013004', email: 'slamet.riyadi@mitrakarya.co.id', noHp: '0812-4444-2222',
    alamat: 'Jl. Mawar No. 12, Cikarang', tanggalLahir: '1988-03-15', jenisKelamin: 'L',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2013-08-01', isDivisionSupervisor: true,
  },
  {
    username: 'spv4', namaLengkap: 'Nina Kartika', role: 'SUPERVISOR', jabatan: 'SPV Marketing', divisi: 'Marketing',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 8100000, nominalUpahLembur: 87000,
    nik: '199204182016005', email: 'nina.kartika@mitrakarya.co.id', noHp: '0812-5555-3333',
    alamat: 'Jl. Dahlia No. 4, Jakarta Timur', tanggalLahir: '1992-04-18', jenisKelamin: 'P',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2016-09-01', isDivisionSupervisor: true,
  },
  {
    username: 'spv5', namaLengkap: 'Hendro Saputra', role: 'SUPERVISOR', jabatan: 'SPV Gudang', divisi: 'Gudang',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 7800000, nominalUpahLembur: 84000,
    nik: '199009252015006', email: 'hendro.saputra@mitrakarya.co.id', noHp: '0812-6666-4444',
    alamat: 'Jl. Flamboyan No. 8, Cikarang', tanggalLahir: '1990-09-25', jenisKelamin: 'L',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2015-11-01', isDivisionSupervisor: true,
  },

  // ----- Karyawan Elektrik -----
  {
    username: 'karyawan1', namaLengkap: 'Budi Santoso', role: 'KARYAWAN', jabatan: 'Teknisi Elektrik', divisi: 'Elektrik',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 6200000, nominalUpahLembur: 75000,
    nik: '198502142014001', email: 'budi.santoso@mitrakarya.co.id', noHp: '0812-3456-7890',
    alamat: 'Jl. Kenanga No. 12, Bekasi', tanggalLahir: '1985-02-14', jenisKelamin: 'L',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2014-03-03',
  },
  {
    username: 'eko.wahyudi', namaLengkap: 'Eko Wahyudi', role: 'KARYAWAN', jabatan: 'Teknisi Elektrik', divisi: 'Elektrik',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 6300000, nominalUpahLembur: 76000,
    nik: '198811072016007', email: 'eko.wahyudi@mitrakarya.co.id', noHp: '0813-1111-2222',
    alamat: 'Jl. Kenanga No. 20, Bekasi', tanggalLahir: '1988-11-07', jenisKelamin: 'L',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2016-04-01',
  },
  {
    username: 'joko.susilo', namaLengkap: 'Joko Susilo', role: 'KARYAWAN', jabatan: 'Teknisi Elektrik Junior', divisi: 'Elektrik',
    statusKaryawan: 'KONTRAK', satuanUpah: 'PER_BULAN', nominalUpah: 4800000, nominalUpahLembur: 60000,
    nik: '199705192023008', email: 'joko.susilo@mitrakarya.co.id', noHp: '0813-2222-3333',
    alamat: 'Jl. Kenanga No. 25, Bekasi', tanggalLahir: '1997-05-19', jenisKelamin: 'L',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2023-09-01', tanggalAkhirKontrak: '2026-09-01',
  },

  // ----- Karyawan QC -----
  {
    username: 'wahyu.pratama', namaLengkap: 'Wahyu Pratama', role: 'KARYAWAN', jabatan: 'Staff QC', divisi: 'QC',
    statusKaryawan: 'KONTRAK', satuanUpah: 'PER_BULAN', nominalUpah: 4900000, nominalUpahLembur: 62000,
    nik: '199912042022009', email: 'wahyu.pratama@mitrakarya.co.id', noHp: '0813-3333-4444',
    alamat: 'Jl. Cempaka No. 11, Bekasi', tanggalLahir: '1999-12-04', jenisKelamin: 'L',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2022-10-01', tanggalAkhirKontrak: '2026-10-01',
  },
  {
    username: 'putri.wulandari', namaLengkap: 'Putri Wulandari', role: 'KARYAWAN', jabatan: 'Staff QC', divisi: 'QC',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 5800000, nominalUpahLembur: 70000,
    nik: '199803212017010', email: 'putri.wulandari@mitrakarya.co.id', noHp: '0813-4444-5555',
    alamat: 'Jl. Cempaka No. 15, Bekasi', tanggalLahir: '1998-03-21', jenisKelamin: 'P',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2017-06-01',
  },
  {
    username: 'dewi.lestari', namaLengkap: 'Dewi Lestari', role: 'KARYAWAN', jabatan: 'Staff QC', divisi: 'QC',
    statusKaryawan: 'HARIAN', satuanUpah: 'PER_JAM', nominalUpah: 28000, nominalUpahLembur: 28000, pengaliLembur: 2,
    nik: '200001152024011', email: 'dewi.lestari@mitrakarya.co.id', noHp: '0813-5555-6666',
    alamat: 'Jl. Cempaka No. 18, Bekasi', tanggalLahir: '2000-01-15', jenisKelamin: 'P',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2024-01-15', tanggalAkhirKontrak: '2026-12-31',
  },

  // ----- Karyawan Produksi -----
  {
    username: 'dedi.kurniawan', namaLengkap: 'Dedi Kurniawan', role: 'KARYAWAN', jabatan: 'Operator Mesin', divisi: 'Produksi',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 5500000, nominalUpahLembur: 68000,
    nik: '199511082013012', email: 'dedi.kurniawan@mitrakarya.co.id', noHp: '0813-6666-7777',
    alamat: 'Jl. Mawar No. 21, Cikarang', tanggalLahir: '1995-11-08', jenisKelamin: 'L',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2013-02-01',
  },
  {
    username: 'lestari.ningsih', namaLengkap: 'Lestari Ningsih', role: 'KARYAWAN', jabatan: 'Operator Mesin', divisi: 'Produksi',
    statusKaryawan: 'HARIAN', satuanUpah: 'PER_JAM', nominalUpah: 27000, nominalUpahLembur: 27000, pengaliLembur: 2,
    nik: '200001292024013', email: 'lestari.ningsih@mitrakarya.co.id', noHp: '0813-7777-8888',
    alamat: 'Jl. Mawar No. 25, Cikarang', tanggalLahir: '2000-01-29', jenisKelamin: 'P',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2024-02-01', tanggalAkhirKontrak: '2026-12-31',
  },
  {
    username: 'agus.setiawan', namaLengkap: 'Agus Setiawan', role: 'KARYAWAN', jabatan: 'Operator Mesin', divisi: 'Produksi',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 5600000, nominalUpahLembur: 69000,
    nik: '199207142014014', email: 'agus.setiawan@mitrakarya.co.id', noHp: '0813-8888-9999',
    alamat: 'Jl. Mawar No. 30, Cikarang', tanggalLahir: '1992-07-14', jenisKelamin: 'L',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2014-06-01',
  },
  {
    username: 'yusuf.maulana', namaLengkap: 'Yusuf Maulana', role: 'KARYAWAN', jabatan: 'Operator Mesin', divisi: 'Produksi',
    statusKaryawan: 'KONTRAK', satuanUpah: 'PER_BULAN', nominalUpah: 4700000, nominalUpahLembur: 59000,
    nik: '199809032023015', email: 'yusuf.maulana@mitrakarya.co.id', noHp: '0813-9999-0000',
    alamat: 'Jl. Mawar No. 33, Cikarang', tanggalLahir: '1998-09-03', jenisKelamin: 'L',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2023-03-01', tanggalAkhirKontrak: '2026-09-01',
  },

  // ----- Karyawan Marketing -----
  {
    username: 'rina.marlina', namaLengkap: 'Rina Marlina', role: 'KARYAWAN', jabatan: 'Staff Marketing', divisi: 'Marketing',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 5900000, nominalUpahLembur: 71000,
    nik: '199406252018016', email: 'rina.marlina@mitrakarya.co.id', noHp: '0814-1111-2222',
    alamat: 'Jl. Dahlia No. 14, Jakarta Timur', tanggalLahir: '1994-06-25', jenisKelamin: 'P',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2018-07-01',
  },
  {
    username: 'fajar.nugroho', namaLengkap: 'Fajar Nugroho', role: 'KARYAWAN', jabatan: 'Staff Marketing', divisi: 'Marketing',
    statusKaryawan: 'KONTRAK', satuanUpah: 'PER_BULAN', nominalUpah: 4900000, nominalUpahLembur: 62000,
    nik: '199702112023017', email: 'fajar.nugroho@mitrakarya.co.id', noHp: '0814-2222-3333',
    alamat: 'Jl. Dahlia No. 18, Jakarta Timur', tanggalLahir: '1997-02-11', jenisKelamin: 'L',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2023-11-01', tanggalAkhirKontrak: '2026-11-01',
  },

  // ----- Karyawan Gudang -----
  {
    username: 'anton.wijaya', namaLengkap: 'Anton Wijaya', role: 'KARYAWAN', jabatan: 'Staff Gudang', divisi: 'Gudang',
    statusKaryawan: 'TETAP', satuanUpah: 'PER_BULAN', nominalUpah: 5400000, nominalUpahLembur: 66000,
    nik: '199108302016018', email: 'anton.wijaya@mitrakarya.co.id', noHp: '0814-3333-4444',
    alamat: 'Jl. Flamboyan No. 16, Cikarang', tanggalLahir: '1991-08-30', jenisKelamin: 'L',
    statusPernikahan: 'Menikah', tanggalMulaiKerja: '2016-12-01',
  },
  {
    username: 'sri.wahyuni', namaLengkap: 'Sri Wahyuni', role: 'KARYAWAN', jabatan: 'Staff Gudang', divisi: 'Gudang',
    statusKaryawan: 'HARIAN', satuanUpah: 'PER_JAM', nominalUpah: 26000, nominalUpahLembur: 26000, pengaliLembur: 2,
    nik: '199912102024019', email: 'sri.wahyuni@mitrakarya.co.id', noHp: '0814-4444-5555',
    alamat: 'Jl. Flamboyan No. 19, Cikarang', tanggalLahir: '1999-12-10', jenisKelamin: 'P',
    statusPernikahan: 'Belum Menikah', tanggalMulaiKerja: '2024-03-01', tanggalAkhirKontrak: '2026-12-31',
  },
];

interface SeededPerson {
  username: string;
  userId: number;
  employeeId: number | null;
  divisiId: number | null;
}

async function seedPeople(divisions: Record<DivisionKey, { id: number }>): Promise<Record<string, SeededPerson>> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const people: Record<string, SeededPerson> = {};

  for (const person of ROSTER) {
    const user = await db.user.upsert({
      where: { username: person.username },
      update: {},
      create: {
        username: person.username,
        passwordHash,
        role: person.role,
        superAdminType: person.superAdminType,
      },
    });

    let employeeId: number | null = null;
    let divisiId: number | null = null;

    if (person.divisi) {
      divisiId = divisions[person.divisi].id;
      const employee = await db.employee.upsert({
        where: { nik: person.nik! },
        update: {},
        create: {
          userId: user.id,
          nik: person.nik!,
          namaLengkap: person.namaLengkap,
          email: person.email!,
          noHp: person.noHp!,
          alamat: person.alamat!,
          tanggalLahir: d(person.tanggalLahir!),
          jenisKelamin: person.jenisKelamin!,
          statusPernikahan: person.statusPernikahan!,
          jabatan: person.jabatan!,
          divisiId,
          statusKaryawan: person.statusKaryawan!,
          tanggalMulaiKerja: d(person.tanggalMulaiKerja!),
          tanggalAkhirKontrak: person.tanggalAkhirKontrak ? d(person.tanggalAkhirKontrak) : null,
          nominalUpah: person.nominalUpah!,
          satuanUpah: person.satuanUpah!,
          nominalUpahLembur: person.nominalUpahLembur!,
          pengaliLembur: person.pengaliLembur ?? null,
        },
      });
      employeeId = employee.id;

      if (person.isDivisionSupervisor) {
        await db.division.update({ where: { id: divisiId }, data: { supervisorEmployeeId: employeeId } });
      }
    }

    people[person.username] = { username: person.username, userId: user.id, employeeId, divisiId };
  }

  return people;
}

// ---------------------------------------------------------------------------
// 4. Projek + SPV Project kontekstual (FR-PRJ-01)
// ---------------------------------------------------------------------------
interface ProjectSpec {
  key: string;
  namaProjek: string;
  tanggalMulai: string;
  tanggalBerakhir: string;
  deskripsi: string;
  spv: string; // username
  status: ProjectStatus;
}

const PROJECT_SPECS: ProjectSpec[] = [
  {
    key: 'line3',
    namaProjek: 'Instalasi Line Produksi 3',
    tanggalMulai: '2026-06-01',
    tanggalBerakhir: '2026-07-31',
    deskripsi: 'Pemasangan dan pengujian line produksi baru di area Plant 2.',
    spv: 'eko.wahyudi', // karyawan biasa ditunjuk jadi SPV Project (FR-PRJ-01: bisa dari posisi apapun)
    status: 'AKTIF',
  },
  {
    key: 'audit-mutu',
    namaProjek: 'Audit Mutu Tahunan 2026',
    tanggalMulai: '2026-06-10',
    tanggalBerakhir: '2026-07-10',
    deskripsi: 'Audit mutu tahunan menyeluruh untuk sertifikasi ISO.',
    spv: 'putri.wulandari',
    status: 'AKTIF',
  },
  {
    key: 'kampanye-q1',
    namaProjek: 'Kampanye Peluncuran Produk Q1',
    tanggalMulai: '2026-01-02',
    tanggalBerakhir: '2026-02-28',
    deskripsi: 'Kampanye marketing lintas-divisi untuk peluncuran produk baru.',
    spv: 'rina.marlina',
    status: 'SELESAI',
  },
  {
    key: 'renovasi-gudang',
    namaProjek: 'Renovasi Gudang B',
    tanggalMulai: '2026-07-15',
    tanggalBerakhir: '2026-09-30',
    deskripsi: 'Renovasi dan penataan ulang area Gudang B untuk kapasitas tambahan.',
    spv: 'anton.wijaya',
    status: 'AKTIF',
  },
];

async function seedProjects(people: Record<string, SeededPerson>, hrdUserId: number): Promise<Record<string, { id: number; tanggalBerakhir: Date }>> {
  const result: Record<string, { id: number; tanggalBerakhir: Date }> = {};
  for (const spec of PROJECT_SPECS) {
    const project = await db.project.create({
      data: {
        namaProjek: spec.namaProjek,
        tanggalMulai: d(spec.tanggalMulai),
        tanggalBerakhir: d(spec.tanggalBerakhir),
        deskripsi: spec.deskripsi,
        spvProjectEmployeeId: people[spec.spv].employeeId!,
        status: spec.status,
        createdByUserId: hrdUserId,
      },
    });
    result[spec.key] = { id: project.id, tanggalBerakhir: project.tanggalBerakhir };
  }
  return result;
}

// ---------------------------------------------------------------------------
// 5. Manpower Request (mode Spesifik & Headcount, status Menunggu/Disetujui/Ditolak)
//    -> yang Disetujui otomatis membentuk ProjectAssignment + ApprovalLog.
// ---------------------------------------------------------------------------
interface ManpowerSpec {
  project: string; // key dari PROJECT_SPECS
  divisi: DivisionKey;
  mode: ManpowerMode;
  employee?: string; // username, wajib utk SPESIFIK & saat HEADCOUNT sudah final
  jumlahDiminta?: number;
  kriteria?: string;
  tanggalMulaiPenugasan: string;
  tanggalAkhirPenugasan: string;
  status: ManpowerStatus;
  approver?: string; // username approver, wajib jika status != MENUNGGU
  assignmentStatus?: AssignmentStatus; // hanya relevan jika status DISETUJUI
}

const MANPOWER_SPECS: ManpowerSpec[] = [
  {
    project: 'line3', divisi: 'Produksi', mode: 'SPESIFIK', employee: 'dedi.kurniawan',
    tanggalMulaiPenugasan: '2026-06-01', tanggalAkhirPenugasan: '2026-07-31',
    status: 'DISETUJUI', approver: 'spv3', assignmentStatus: 'AKTIF',
  },
  {
    project: 'line3', divisi: 'Produksi', mode: 'SPESIFIK', employee: 'lestari.ningsih',
    tanggalMulaiPenugasan: '2026-06-01', tanggalAkhirPenugasan: '2026-07-31',
    status: 'DISETUJUI', approver: 'spv3', assignmentStatus: 'AKTIF',
  },
  {
    project: 'line3', divisi: 'QC', mode: 'HEADCOUNT', jumlahDiminta: 1,
    kriteria: 'Berpengalaman dengan alat ukur presisi', employee: 'wahyu.pratama',
    tanggalMulaiPenugasan: '2026-06-10', tanggalAkhirPenugasan: '2026-07-15',
    status: 'DISETUJUI', approver: 'spv2', assignmentStatus: 'AKTIF',
  },
  {
    project: 'line3', divisi: 'Marketing', mode: 'HEADCOUNT', jumlahDiminta: 1,
    kriteria: 'Untuk dokumentasi foto/video progres projek',
    tanggalMulaiPenugasan: '2026-06-20', tanggalAkhirPenugasan: '2026-07-31',
    status: 'MENUNGGU',
  },
  {
    project: 'line3', divisi: 'Gudang', mode: 'SPESIFIK', employee: 'anton.wijaya',
    tanggalMulaiPenugasan: '2026-06-05', tanggalAkhirPenugasan: '2026-07-31',
    status: 'DITOLAK', approver: 'spv5',
  },
  {
    project: 'audit-mutu', divisi: 'Elektrik', mode: 'SPESIFIK', employee: 'joko.susilo',
    tanggalMulaiPenugasan: '2026-06-10', tanggalAkhirPenugasan: '2026-07-10',
    status: 'DISETUJUI', approver: 'spv1', assignmentStatus: 'AKTIF',
  },
  {
    project: 'kampanye-q1', divisi: 'QC', mode: 'SPESIFIK', employee: 'dewi.lestari',
    tanggalMulaiPenugasan: '2026-01-02', tanggalAkhirPenugasan: '2026-02-28',
    status: 'DISETUJUI', approver: 'spv2', assignmentStatus: 'SELESAI',
  },
  {
    project: 'renovasi-gudang', divisi: 'Produksi', mode: 'HEADCOUNT', jumlahDiminta: 2,
    kriteria: 'Bersedia kerja lapangan & shift fleksibel',
    tanggalMulaiPenugasan: '2026-07-15', tanggalAkhirPenugasan: '2026-09-30',
    status: 'MENUNGGU',
  },
];

async function seedManpowerRequests(
  people: Record<string, SeededPerson>,
  divisions: Record<DivisionKey, { id: number }>,
  projects: Record<string, { id: number; tanggalBerakhir: Date }>,
) {
  for (const spec of MANPOWER_SPECS) {
    const isApproved = spec.status === 'DISETUJUI';
    const isRejected = spec.status === 'DITOLAK';

    const manpowerRequest = await db.manpowerRequest.create({
      data: {
        projectId: projects[spec.project].id,
        divisiAsalId: divisions[spec.divisi].id,
        mode: spec.mode,
        employeeId: spec.employee ? people[spec.employee].employeeId : null,
        jumlahDiminta: spec.mode === 'HEADCOUNT' ? spec.jumlahDiminta : null,
        kriteria: spec.kriteria ?? null,
        tanggalMulaiPenugasan: d(spec.tanggalMulaiPenugasan),
        tanggalAkhirPenugasan: d(spec.tanggalAkhirPenugasan),
        status: spec.status,
        approvedByUserId: isApproved ? people[spec.approver!].userId : null,
        approvedAt: isApproved ? d(spec.tanggalMulaiPenugasan) : null,
      },
    });

    if (isApproved && spec.employee) {
      await db.projectAssignment.create({
        data: {
          employeeId: people[spec.employee].employeeId!,
          projectId: projects[spec.project].id,
          manpowerRequestId: manpowerRequest.id,
          tanggalMulai: d(spec.tanggalMulaiPenugasan),
          tanggalBerakhir: d(spec.tanggalAkhirPenugasan),
          status: spec.assignmentStatus ?? 'AKTIF',
        },
      });

      await db.notification.create({
        data: {
          userId: people[spec.employee].userId,
          judul: 'Anda Ditugaskan ke Projek Baru',
          pesan: `Anda ditugaskan penuh waktu ke projek terkait mulai ${spec.tanggalMulaiPenugasan} hingga ${spec.tanggalAkhirPenugasan}. Tugas reguler di divisi asal Anda dijeda sementara.`,
          jenis: 'SISTEM',
          referensiId: manpowerRequest.id,
          sudahDibaca: spec.assignmentStatus === 'SELESAI',
        },
      });
    }

    if (isApproved || isRejected) {
      await db.approvalLog.create({
        data: {
          jenisPengajuan: 'MANPOWER_REQUEST',
          referensiId: manpowerRequest.id,
          aktorUserId: people[spec.approver!].userId,
          hasil: isApproved ? 'DISETUJUI' : 'DITOLAK',
          catatan: isRejected ? 'Karyawan masih sangat dibutuhkan penuh di divisi asal saat ini.' : null,
        },
      });
    }

    if (isRejected && spec.employee) {
      await db.notification.create({
        data: {
          userId: people[spec.employee].userId,
          judul: 'Request Manpower Anda Ditolak',
          pesan: 'Permintaan penugasan Anda ke projek lain ditolak oleh supervisor divisi asal.',
          jenis: 'STATUS_APPROVAL',
          referensiId: manpowerRequest.id,
          sudahDibaca: true,
        },
      });
    }

    if (spec.status === 'MENUNGGU') {
      // Beri tahu supervisor divisi tujuan bahwa ada request manpower yang menunggu approval-nya.
      const supervisorEntry = Object.values(people).find(
        (p) => p.divisiId === divisions[spec.divisi].id && p.username.startsWith('spv'),
      );
      if (supervisorEntry) {
        await db.notification.create({
          data: {
            userId: supervisorEntry.userId,
            judul: 'Ada Request Manpower Baru',
            pesan: 'Sebuah projek mengajukan permintaan tenaga kerja dari divisi Anda — menunggu persetujuan Anda.',
            jenis: 'PENGAJUAN',
            referensiId: manpowerRequest.id,
            sudahDibaca: false,
          },
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Pengajuan Cuti/Izin — mencakup status Menunggu, Disetujui, dan Ditolak,
//    serta keempat jenisnya (Izin, Cuti Tahunan, Sakit, Melahirkan).
// ---------------------------------------------------------------------------
interface LeaveSpec {
  employee: string;
  jenisCuti: JenisCuti;
  tanggalMulai: string;
  tanggalSelesai: string;
  alasan: string;
  dokumenPendukungUrl?: string;
  status: LeaveStatus;
  approver?: string;
}

const LEAVE_SPECS: LeaveSpec[] = [
  {
    employee: 'karyawan1', jenisCuti: 'CUTI_TAHUNAN', tanggalMulai: '2026-06-08', tanggalSelesai: '2026-06-09',
    alasan: 'Menghadiri acara pernikahan keluarga di Yogyakarta.', status: 'DISETUJUI', approver: 'spv1',
  },
  {
    employee: 'karyawan1', jenisCuti: 'SAKIT', tanggalMulai: '2026-05-29', tanggalSelesai: '2026-05-29',
    alasan: 'Demam tinggi, istirahat sesuai anjuran dokter.', dokumenPendukungUrl: 'https://example.com/dokumen/surat-dokter-budi.pdf',
    status: 'DISETUJUI', approver: 'spv1',
  },
  {
    employee: 'eko.wahyudi', jenisCuti: 'IZIN', tanggalMulai: '2026-06-19', tanggalSelesai: '2026-06-19',
    alasan: 'Mengurus surat keluarga di kelurahan.', status: 'MENUNGGU',
  },
  {
    employee: 'joko.susilo', jenisCuti: 'CUTI_TAHUNAN', tanggalMulai: '2026-06-22', tanggalSelesai: '2026-06-23',
    alasan: 'Acara keluarga di luar kota.', status: 'MENUNGGU',
  },
  {
    employee: 'putri.wulandari', jenisCuti: 'IZIN', tanggalMulai: '2026-05-10', tanggalSelesai: '2026-05-10',
    alasan: 'Keperluan pribadi mendesak.', status: 'DITOLAK', approver: 'hrd2',
  },
  {
    employee: 'dedi.kurniawan', jenisCuti: 'SAKIT', tanggalMulai: '2026-06-15', tanggalSelesai: '2026-06-16',
    alasan: 'Tipes, perlu istirahat total.', dokumenPendukungUrl: 'https://example.com/dokumen/surat-dokter-dedi.pdf',
    status: 'DISETUJUI', approver: 'spv3',
  },
  {
    employee: 'lestari.ningsih', jenisCuti: 'CUTI_TAHUNAN', tanggalMulai: '2026-07-01', tanggalSelesai: '2026-07-03',
    alasan: 'Pulang kampung.', status: 'MENUNGGU',
  },
  {
    employee: 'rina.marlina', jenisCuti: 'MELAHIRKAN', tanggalMulai: '2026-06-01', tanggalSelesai: '2026-08-30',
    alasan: 'Cuti melahirkan anak pertama.', dokumenPendukungUrl: 'https://example.com/dokumen/surat-melahirkan-rina.pdf',
    status: 'DISETUJUI', approver: 'hrd1',
  },
  {
    employee: 'anton.wijaya', jenisCuti: 'IZIN', tanggalMulai: '2026-06-05', tanggalSelesai: '2026-06-05',
    alasan: 'Antar anak ke rumah sakit.', status: 'DITOLAK', approver: 'spv5',
  },
  {
    employee: 'sri.wahyuni', jenisCuti: 'IZIN', tanggalMulai: '2026-06-12', tanggalSelesai: '2026-06-12',
    alasan: 'Keperluan keluarga.', status: 'DISETUJUI', approver: 'spv5',
  },
  {
    employee: 'agus.setiawan', jenisCuti: 'CUTI_TAHUNAN', tanggalMulai: '2026-06-25', tanggalSelesai: '2026-06-26',
    alasan: 'Liburan keluarga.', status: 'MENUNGGU',
  },
  {
    employee: 'fajar.nugroho', jenisCuti: 'SAKIT', tanggalMulai: '2026-06-11', tanggalSelesai: '2026-06-11',
    alasan: 'Flu berat.', status: 'DISETUJUI', approver: 'spv4',
  },
];

async function seedLeaveRequests(people: Record<string, SeededPerson>) {
  for (const spec of LEAVE_SPECS) {
    const leaveRequest = await db.leaveRequest.create({
      data: {
        employeeId: people[spec.employee].employeeId!,
        jenisCuti: spec.jenisCuti,
        tanggalMulai: d(spec.tanggalMulai),
        tanggalSelesai: d(spec.tanggalSelesai),
        alasan: spec.alasan,
        dokumenPendukungUrl: spec.dokumenPendukungUrl ?? null,
        status: spec.status,
        approvedByUserId: spec.approver ? people[spec.approver].userId : null,
        approvedAt: spec.approver ? d(spec.tanggalMulai) : null,
      },
    });

    if (spec.status !== 'MENUNGGU' && spec.approver) {
      await db.approvalLog.create({
        data: {
          jenisPengajuan: 'LEAVE_REQUEST',
          referensiId: leaveRequest.id,
          aktorUserId: people[spec.approver].userId,
          hasil: spec.status === 'DISETUJUI' ? 'DISETUJUI' : 'DITOLAK',
          catatan: spec.status === 'DITOLAK' ? 'Beban kerja tim sedang tinggi pada periode tersebut.' : null,
        },
      });

      await db.notification.create({
        data: {
          userId: people[spec.employee].userId,
          judul: spec.status === 'DISETUJUI' ? 'Pengajuan Cuti Disetujui' : 'Pengajuan Cuti Ditolak',
          pesan:
            spec.status === 'DISETUJUI'
              ? `Pengajuan ${spec.jenisCuti.replace('_', ' ').toLowerCase()} Anda telah disetujui.`
              : `Pengajuan ${spec.jenisCuti.replace('_', ' ').toLowerCase()} Anda ditolak. Hubungi atasan untuk detail.`,
          jenis: 'STATUS_APPROVAL',
          referensiId: leaveRequest.id,
          sudahDibaca: Math.random() > 0.4,
        },
      });
    } else {
      // Beri tahu supervisor divisi asal bahwa ada pengajuan baru menunggu (FR-NOT-01).
      const employeeDivisiId = people[spec.employee].divisiId;
      const supervisorEntry = Object.values(people).find(
        (p) => p.divisiId === employeeDivisiId && p.username.startsWith('spv'),
      );
      if (supervisorEntry) {
        await db.notification.create({
          data: {
            userId: supervisorEntry.userId,
            judul: 'Pengajuan Cuti/Izin Baru',
            pesan: `${spec.employee} mengajukan ${spec.jenisCuti.replace('_', ' ').toLowerCase()} — menunggu persetujuan Anda.`,
            jenis: 'PENGAJUAN',
            referensiId: leaveRequest.id,
            sudahDibaca: false,
          },
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Pengajuan Lembur — individual (semua status) & massal (DicatatOtomatis).
// ---------------------------------------------------------------------------
interface OvertimeIndividualSpec {
  employee: string;
  tanggal: string;
  deskripsiAlasan: string;
  status: OvertimeStatus;
}

const OVERTIME_INDIVIDUAL_SPECS: OvertimeIndividualSpec[] = [
  { employee: 'karyawan1', tanggal: '2026-06-06', deskripsiAlasan: '08:00–15:00, perbaikan genset darurat.', status: 'DISETUJUI' },
  { employee: 'eko.wahyudi', tanggal: '2026-05-30', deskripsiAlasan: '08:00–13:00, lembur tanggal merah Hari Raya Waisak.', status: 'DISETUJUI' },
  { employee: 'joko.susilo', tanggal: '2026-06-20', deskripsiAlasan: '08:00–14:00, instalasi listrik gedung baru.', status: 'DIAJUKAN' },
  { employee: 'dewi.lestari', tanggal: '2026-06-15', deskripsiAlasan: '17:00–20:00, lembur jam tambahan setelah shift QC.', status: 'DIAJUKAN' },
  { employee: 'putri.wulandari', tanggal: '2026-06-12', deskripsiAlasan: '17:00–19:00, cek ulang sampel produksi.', status: 'DITOLAK' },
  { employee: 'dedi.kurniawan', tanggal: '2026-06-07', deskripsiAlasan: '08:00–16:00, lembur akhir pekan target produksi.', status: 'DISETUJUI' },
  { employee: 'anton.wijaya', tanggal: '2026-06-13', deskripsiAlasan: '08:00–14:00, stok ulang gudang sebelum audit.', status: 'DIAJUKAN' },
];

interface OvertimeBulkSpec {
  tanggal: string;
  deskripsiAlasan: string;
  inputBy: string;
  members: string[];
}

const OVERTIME_BULK_SPECS: OvertimeBulkSpec[] = [
  {
    tanggal: '2026-06-21',
    deskripsiAlasan: 'Lembur akhir pekan instalasi Line Produksi 3 — seluruh anggota projek.',
    inputBy: 'eko.wahyudi', // SPV Project
    members: ['dedi.kurniawan', 'lestari.ningsih', 'wahyu.pratama'],
  },
  {
    tanggal: '2026-05-30',
    deskripsiAlasan: 'Lembur tanggal merah Hari Raya Waisak — seluruh tim Elektrik.',
    inputBy: 'spv1',
    members: ['karyawan1', 'eko.wahyudi'],
  },
];

async function seedOvertimeRequests(people: Record<string, SeededPerson>) {
  for (const spec of OVERTIME_INDIVIDUAL_SPECS) {
    await db.overtimeRequest.create({
      data: {
        employeeId: people[spec.employee].employeeId!,
        jenis: 'INDIVIDUAL',
        tanggal: d(spec.tanggal),
        deskripsiAlasan: spec.deskripsiAlasan,
        status: spec.status,
      },
    });
  }

  for (const spec of OVERTIME_BULK_SPECS) {
    await db.overtimeRequest.create({
      data: {
        jenis: 'MASSAL',
        tanggal: d(spec.tanggal),
        deskripsiAlasan: spec.deskripsiAlasan,
        status: 'DICATAT_OTOMATIS',
        inputByUserId: people[spec.inputBy].userId,
        members: { create: spec.members.map((username) => ({ employeeId: people[username].employeeId! })) },
      },
    });
  }
}

// ---------------------------------------------------------------------------
// 8. Riwayat Absensi — 14 hari kerja terakhir untuk setiap karyawan/supervisor,
//    bervariasi (Tepat Waktu/Terlambat/Alfa/Pulang Cepat), skip jika sedang
//    cuti yang disetujui pada tanggal tersebut.
// ---------------------------------------------------------------------------
const ACTIVITY_SAMPLES = [
  'Maintenance Mesin Produksi Line 2',
  'Perbaikan Panel Listrik',
  'Pengecekan Instalasi',
  'Inspeksi Mutu Bahan Baku',
  'Pengemasan Produk Jadi',
  'Stok Opname Gudang',
  'Rapat Koordinasi Tim',
  'Dokumentasi Aktivitas Marketing',
  'Perawatan Rutin Peralatan',
];

async function seedAttendance(people: Record<string, SeededPerson>, approvedLeaves: LeaveSpec[]) {
  const employeesWithRole = ROSTER.filter((p) => p.divisi); // semua kecuali super admin
  const today = startOfDay(new Date());

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const tanggal = startOfDay(addDays(today, -dayOffset));
    const dow = tanggal.getUTCDay();
    if (dow === 0 || dow === 6) continue; // lewati Sabtu/Minggu untuk pola reguler

    let empIndex = 0;
    for (const person of employeesWithRole) {
      empIndex += 1;
      const seed = people[person.username];
      if (!seed.employeeId) continue;

      // Lewati hari ini jika karyawan sedang cuti yang disetujui pada tanggal tersebut.
      const onApprovedLeave = approvedLeaves.some(
        (lv) =>
          lv.employee === person.username &&
          lv.status === 'DISETUJUI' &&
          overlaps(tanggal, tanggal, d(lv.tanggalMulai), d(lv.tanggalSelesai)),
      );
      if (onApprovedLeave) continue;

      const variant = (dayOffset + empIndex) % 5;
      const activity = ACTIVITY_SAMPLES[(dayOffset + empIndex) % ACTIVITY_SAMPLES.length];
      const tanggalStr = tanggal.toISOString().slice(0, 10);

      let jamMasuk: Date;
      let jamKeluar: Date | null;
      let statusKehadiran: StatusKehadiran;

      if (person.statusKaryawan === 'HARIAN') {
        // Karyawan harian: selalu Tepat Waktu, jam aktual bervariasi sedikit.
        jamMasuk = dt(tanggalStr, variant % 2 === 0 ? '07:55' : '08:05');
        jamKeluar = dt(tanggalStr, '16:30');
        statusKehadiran = 'TEPAT_WAKTU';
      } else if (variant === 0) {
        jamMasuk = dt(tanggalStr, '07:55');
        jamKeluar = dt(tanggalStr, '17:05');
        statusKehadiran = 'TEPAT_WAKTU';
      } else if (variant === 1) {
        jamMasuk = dt(tanggalStr, '08:20');
        jamKeluar = dt(tanggalStr, '17:00');
        statusKehadiran = 'TERLAMBAT';
      } else if (variant === 2) {
        jamMasuk = dt(tanggalStr, '07:50');
        jamKeluar = dt(tanggalStr, '17:02');
        statusKehadiran = 'TEPAT_WAKTU';
      } else if (variant === 3) {
        jamMasuk = dt(tanggalStr, '13:15');
        jamKeluar = dt(tanggalStr, '17:00');
        statusKehadiran = 'ALFA';
      } else {
        jamMasuk = dt(tanggalStr, '07:58');
        jamKeluar = dt(tanggalStr, '15:30');
        statusKehadiran = 'PULANG_CEPAT';
      }

      // Hari ini (dayOffset 0): biarkan separuh karyawan belum absen pulang, mensimulasikan kondisi real-time.
      if (dayOffset === 0 && empIndex % 2 === 0) {
        jamKeluar = null;
        if (statusKehadiran === 'PULANG_CEPAT') statusKehadiran = 'TEPAT_WAKTU';
      }

      await db.attendance.upsert({
        where: { employeeId_tanggal: { employeeId: seed.employeeId, tanggal } },
        update: {},
        create: {
          employeeId: seed.employeeId,
          tanggal,
          jamMasuk,
          jamKeluar,
          namaProjekAktivitas: activity,
          lokasiKerja: empIndex % 7 === 0 ? 'LAINNYA' : 'KANTOR',
          lokasiLainnyaDetail: empIndex % 7 === 0 ? 'Lokasi klien, Jakarta Pusat' : null,
          latitude: -6.2 + (empIndex % 10) * 0.001,
          longitude: 106.8 + (empIndex % 10) * 0.001,
          statusKehadiran,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 9. Notifikasi tambahan yang berdiri sendiri (pengingat sistem, dll).
// ---------------------------------------------------------------------------
async function seedStandaloneNotifications(people: Record<string, SeededPerson>) {
  const extra: { username: string; judul: string; pesan: string; jenis: NotifJenis; sudahDibaca: boolean }[] = [
    {
      username: 'karyawan1', judul: 'Pengingat Absen Pulang',
      pesan: 'Anda belum melakukan absen pulang untuk kemarin. Pastikan absen tepat waktu.',
      jenis: 'SISTEM', sudahDibaca: true,
    },
    {
      username: 'hrd1', judul: 'Kontrak Karyawan Akan Berakhir',
      pesan: 'Kontrak beberapa karyawan akan berakhir dalam 3 bulan ke depan — segera tinjau perpanjangan.',
      jenis: 'SISTEM', sudahDibaca: false,
    },
    {
      username: 'spv2', judul: 'Pengingat Approval Tertunda',
      pesan: 'Ada pengajuan dari tim Anda yang sudah menunggu lebih dari 2 hari.',
      jenis: 'SISTEM', sudahDibaca: false,
    },
    {
      username: 'eko.wahyudi', judul: 'Due Date Projek Mendekat',
      pesan: 'Projek "Instalasi Line Produksi 3" akan berakhir dalam beberapa minggu — pastikan progres sesuai target.',
      jenis: 'SISTEM', sudahDibaca: false,
    },
  ];

  for (const item of extra) {
    await db.notification.create({
      data: {
        userId: people[item.username].userId,
        judul: item.judul,
        pesan: item.pesan,
        jenis: item.jenis,
        sudahDibaca: item.sudahDibaca,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Membersihkan data transaksional lama...');
  await clearTransactionalData();

  console.log('Seeding divisi...');
  const divisions = await seedDivisions();

  console.log('Seeding user & karyawan...');
  const people = await seedPeople(divisions);

  console.log('Seeding projek...');
  const projects = await seedProjects(people, people['hrd1'].userId);

  console.log('Seeding request manpower & penugasan projek...');
  await seedManpowerRequests(people, divisions, projects);

  console.log('Seeding pengajuan cuti/izin...');
  await seedLeaveRequests(people);

  console.log('Seeding pengajuan lembur...');
  await seedOvertimeRequests(people);

  console.log('Seeding riwayat absensi 14 hari terakhir...');
  await seedAttendance(people, LEAVE_SPECS);

  console.log('Seeding notifikasi tambahan...');
  await seedStandaloneNotifications(people);

  console.log('\nSeed selesai. Semua akun memakai password:', DEFAULT_PASSWORD);
  console.log('--- Super Admin ---');
  console.log('- admin1     Hartono (Direktur)');
  console.log('- itmaint1   Joko Prasetyo (IT/Maintenance — diblokir dari approve/reject)');
  console.log('--- HRD ---');
  console.log('- hrd1       Siti Rahma');
  console.log('- hrd2       Maria Christanti');
  console.log('--- Supervisor (1 per divisi) ---');
  console.log('- spv1 Andi Wijaya (Elektrik) | spv2 Bambang Sutrisno (QC) | spv3 Slamet Riyadi (Produksi)');
  console.log('- spv4 Nina Kartika (Marketing) | spv5 Hendro Saputra (Gudang)');
  console.log('--- Karyawan (16 orang, username = nama.depan.belakang, kecuali karyawan1 = Budi Santoso) ---');
  console.log('Lihat docs/copilot-guides/backend-guide.md atau tabel ROSTER di seed.ts untuk daftar lengkap.');
  console.log('\nData flow yang disimulasikan: 4 projek, 8 request manpower (Spesifik/Headcount, Menunggu/Disetujui/Ditolak),');
  console.log('12 pengajuan cuti (4 jenis x 3 status), 9 pengajuan lembur (individual+massal, semua status),');
  console.log('~190 baris riwayat absensi (14 hari kerja), serta notifikasi & audit log approval terkait.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
