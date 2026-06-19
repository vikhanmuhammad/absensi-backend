import { StatusKaryawan, StatusKehadiran } from '@prisma/client';
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
