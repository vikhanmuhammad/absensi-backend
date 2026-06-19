import { Role, StatusKaryawan, StatusKehadiran } from '@prisma/client';
import { db } from '../utils/db';
import { getSystemSettings, timeToDecimal } from './settingsService';

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function hitungStatusMasuk(jamMasuk: Date, statusKaryawan: StatusKaryawan): Promise<StatusKehadiran> {
  if (statusKaryawan === 'HARIAN') {
    // Karyawan harian lepas tidak terikat jam baku — dicatat Tepat Waktu, upah dihitung dari jam aktual.
    return 'TEPAT_WAKTU';
  }
  const settings = await getSystemSettings();
  const batasTerlambat = timeToDecimal(settings.batasTerlambat);
  const batasAlfa = timeToDecimal(settings.batasAlfa);
  const jamDesimal = jamMasuk.getHours() + jamMasuk.getMinutes() / 60;
  if (jamDesimal > batasAlfa) return 'ALFA';
  if (jamDesimal > batasTerlambat) return 'TERLAMBAT';
  return 'TEPAT_WAKTU';
}

/** Jam pulang reguler ("HH:mm" -> desimal) sesuai Pengaturan Sistem — dipakai untuk deteksi Pulang Cepat. */
export async function getJamPulangReguler(): Promise<number> {
  const settings = await getSystemSettings();
  return timeToDecimal(settings.jamPulangStandar);
}

/** Cek apakah karyawan sedang "Assigned to Project" pada tanggal tertentu (FR-ABS-02). */
export async function getActiveProjectAssignment(employeeId: number, tanggal: Date) {
  return db.projectAssignment.findFirst({
    where: {
      employeeId,
      status: 'AKTIF',
      tanggalMulai: { lte: tanggal },
      tanggalBerakhir: { gte: tanggal },
    },
    include: { project: true },
  });
}

/** Koordinat GPS hanya boleh dilihat HRD/Super Admin (FR-ABS-05) — karyawan tidak pernah melihatnya. */
export function omitLocationIfNotPrivileged<T extends Record<string, unknown> | null>(record: T, role: string): T {
  if (!record) return record;
  if (role === 'HRD' || role === 'SUPER_ADMIN') return record;
  const { latitude, longitude, ...rest } = record;
  return rest as T;
}

/** Apakah employee ini sedang menjadi SPV Project untuk minimal 1 projek AKTIF. */
export async function isSpvOfAnyActiveProject(employeeId: number): Promise<boolean> {
  const count = await db.project.count({ where: { spvProjectEmployeeId: employeeId, status: 'AKTIF' } });
  return count > 0;
}

/**
 * Daftar karyawan yang boleh diinput absensinya lewat form Input Absensi Massal oleh aktor ini:
 * - SUPER_ADMIN / HRD → semua karyawan aktif
 * - SUPERVISOR → anggota divisinya yang TIDAK sedang di-assign ke projek lain, + dirinya sendiri
 * - KARYAWAN yang sedang menjadi SPV Project → anggota projek yang dia pimpin, + dirinya sendiri
 */
export async function getBulkAttendanceTargets(role: Role, employeeId: number | null) {
  if (role === 'SUPER_ADMIN' || role === 'HRD') {
    return db.employee.findMany({
      where: { statusAktif: true },
      include: { divisi: true },
      orderBy: { namaLengkap: 'asc' },
    });
  }

  if (!employeeId) return [];

  // Catatan: status AKTIF (bukan rentang tanggal) jadi acuan "sedang ditugaskan/SPV projek",
  // konsisten dengan tampilan Detail Projek — belum ada scheduler otomatis yang mengubah status
  // berdasarkan tanggalMulai/tanggalBerakhir (lihat TODO di manpower-requests/[id]/reject.ts).
  const resultIds = new Set<number>([employeeId]);

  if (role === 'SUPERVISOR') {
    const self = await db.employee.findUnique({ where: { id: employeeId }, select: { divisiId: true } });
    if (self) {
      const divisionMembers = await db.employee.findMany({
        where: { divisiId: self.divisiId, statusAktif: true },
        include: {
          projectAssignments: { where: { status: 'AKTIF' } },
        },
      });
      for (const member of divisionMembers) {
        if (member.id === employeeId || member.projectAssignments.length === 0) {
          resultIds.add(member.id);
        }
      }
    }
  }

  const spvProjects = await db.project.findMany({
    where: { spvProjectEmployeeId: employeeId, status: 'AKTIF' },
    select: { id: true },
  });
  if (spvProjects.length > 0) {
    const assignments = await db.projectAssignment.findMany({
      where: { projectId: { in: spvProjects.map((p) => p.id) }, status: 'AKTIF' },
      select: { employeeId: true },
    });
    assignments.forEach((a) => resultIds.add(a.employeeId));
  }

  return db.employee.findMany({
    where: { id: { in: Array.from(resultIds) }, statusAktif: true },
    include: { divisi: true },
    orderBy: { namaLengkap: 'asc' },
  });
}
