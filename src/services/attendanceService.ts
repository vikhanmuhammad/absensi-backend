import { StatusKaryawan, StatusKehadiran } from '@prisma/client';
import { db } from '../utils/db';

// TODO: pindahkan ke tabel Settings yang bisa diatur HRD lewat halaman Pengaturan Sistem.
export const BATAS_TERLAMBAT_JAM = 8; // masuk > 08:00 = Terlambat
export const BATAS_ALFA_JAM = 12; // masuk > 12:00 = Alfa
export const JAM_KELUAR_REGULER = 17; // pulang < 17:00 = Pulang Cepat

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function hitungStatusMasuk(jamMasuk: Date, statusKaryawan: StatusKaryawan): StatusKehadiran {
  if (statusKaryawan === 'HARIAN') {
    // Karyawan harian lepas tidak terikat jam baku — dicatat Tepat Waktu, upah dihitung dari jam aktual.
    return 'TEPAT_WAKTU';
  }
  const jamDesimal = jamMasuk.getHours() + jamMasuk.getMinutes() / 60;
  if (jamDesimal > BATAS_ALFA_JAM) return 'ALFA';
  if (jamDesimal > BATAS_TERLAMBAT_JAM) return 'TERLAMBAT';
  return 'TEPAT_WAKTU';
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
