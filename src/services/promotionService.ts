import { JenisPromosi, StatusKaryawan, SatuanUpah } from '@prisma/client';
import { db } from '../utils/db';
import { startOfDay } from './attendanceService';

export interface PromotionInput {
  employeeId: number;
  jenisPromosi: JenisPromosi;
  nominalUpahBaru: number;
  satuanUpahBaru: SatuanUpah;
  nominalUpahLemburBaru: number;
  pengaliLemburBaru?: number | null;
  tanggalMulai: Date;
  tanggalSelesai?: Date | null;
}

export interface PromotionResult {
  employeeId: number;
  ok: boolean;
  message?: string;
  promotionId?: number;
}

// Status karyawan saat ini yang disyaratkan utk tiap jenis promosi (null = tidak disyaratkan).
const ORIGIN_STATUS: Record<JenisPromosi, StatusKaryawan | null> = {
  HARIAN_KE_KONTRAK: 'HARIAN',
  KONTRAK_KE_TETAP: 'KONTRAK',
  PERPANJANGAN_KONTRAK: 'KONTRAK',
  PERUBAHAN_GAJI: null,
};

// Status karyawan baru setelah promosi diterapkan (null = status tidak berubah, hanya gaji).
const TARGET_STATUS: Record<JenisPromosi, StatusKaryawan | null> = {
  HARIAN_KE_KONTRAK: 'KONTRAK',
  KONTRAK_KE_TETAP: 'TETAP',
  PERPANJANGAN_KONTRAK: 'KONTRAK',
  PERUBAHAN_GAJI: null,
};

// Jenis yang mengubah status/periode kontrak (vs PERUBAHAN_GAJI yang murni gaji).
const TOUCHES_KONTRAK: Record<JenisPromosi, boolean> = {
  HARIAN_KE_KONTRAK: true,
  KONTRAK_KE_TETAP: true,
  PERPANJANGAN_KONTRAK: true,
  PERUBAHAN_GAJI: false,
};

function computeKontrakKeBaru(jenisPromosi: JenisPromosi, kontrakKeSaatIni: number): number | null {
  if (jenisPromosi === 'HARIAN_KE_KONTRAK') return 1;
  if (jenisPromosi === 'PERPANJANGAN_KONTRAK') return kontrakKeSaatIni + 1;
  return null; // KONTRAK_KE_TETAP & PERUBAHAN_GAJI tidak mengubah hitungan kontrak
}

export async function createPromotion(input: PromotionInput, aktorUserId: number): Promise<PromotionResult> {
  const employee = await db.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) return { employeeId: input.employeeId, ok: false, message: 'Karyawan tidak ditemukan' };

  const requiredOrigin = ORIGIN_STATUS[input.jenisPromosi];
  if (requiredOrigin && employee.statusKaryawan !== requiredOrigin) {
    return {
      employeeId: input.employeeId,
      ok: false,
      message: `${employee.namaLengkap} bukan status ${requiredOrigin} (saat ini ${employee.statusKaryawan}), dilewati`,
    };
  }

  const statusBaru = TARGET_STATUS[input.jenisPromosi] ?? employee.statusKaryawan;
  const kontrakKeBaru = computeKontrakKeBaru(input.jenisPromosi, employee.kontrakKe);

  // KONTRAK_KE_TETAP selalu null (Tetap tak punya akhir kontrak). Utk jenis lain, tanggal
  // selesai opsional — kalau diisi, akan diterapkan ke tanggalAkhirKontrak; kalau tidak, dibiarkan
  // apa adanya (PERUBAHAN_GAJI tanpa tanggal selesai TIDAK PERNAH menyentuh tanggalAkhirKontrak).
  const tanggalSelesai = input.jenisPromosi === 'KONTRAK_KE_TETAP' ? null : input.tanggalSelesai ?? null;

  const today = startOfDay(new Date());
  const mulai = startOfDay(input.tanggalMulai);
  const applyNow = mulai <= today;

  const promotion = await db.$transaction(async (tx) => {
    const created = await tx.employeePromotion.create({
      data: {
        employeeId: input.employeeId,
        jenisPromosi: input.jenisPromosi,
        statusBaru,
        nominalUpahBaru: input.nominalUpahBaru,
        satuanUpahBaru: input.satuanUpahBaru,
        nominalUpahLemburBaru: input.nominalUpahLemburBaru,
        pengaliLemburBaru: input.pengaliLemburBaru ?? null,
        kontrakKeBaru,
        tanggalMulai: mulai,
        tanggalSelesai,
        status: applyNow ? 'AKTIF' : 'DIJADWALKAN',
        diprosesOlehUserId: aktorUserId,
        appliedAt: applyNow ? new Date() : null,
      },
    });

    if (applyNow) {
      // Utk PERUBAHAN_GAJI, hanya sentuh tanggalAkhirKontrak jika eksplisit diisi (lihat catatan di atas).
      const shouldTouchTanggalSelesai = input.jenisPromosi !== 'PERUBAHAN_GAJI' || tanggalSelesai !== null;
      await tx.employee.update({
        where: { id: input.employeeId },
        data: {
          statusKaryawan: statusBaru,
          nominalUpah: input.nominalUpahBaru,
          satuanUpah: input.satuanUpahBaru,
          nominalUpahLembur: input.nominalUpahLemburBaru,
          pengaliLembur: input.pengaliLemburBaru ?? null,
          ...(shouldTouchTanggalSelesai ? { tanggalAkhirKontrak: tanggalSelesai } : {}),
          ...(kontrakKeBaru !== null ? { kontrakKe: kontrakKeBaru } : {}),
          // Status/periode kontrak berubah (promosi/perpanjangan) -> pastikan aktif lagi,
          // misal sebelumnya dinonaktifkan otomatis oleh scheduler karena kontrak lama berakhir.
          ...(TOUCHES_KONTRAK[input.jenisPromosi] ? { statusAktif: true } : {}),
        },
      });
    }

    return created;
  });

  return { employeeId: input.employeeId, ok: true, promotionId: promotion.id };
}

/** Dipanggil scheduler: terapkan promosi DIJADWALKAN yang tanggalMulai-nya sudah tercapai. */
export async function runDuePromotions(): Promise<{ applied: number; cancelled: number }> {
  const today = startOfDay(new Date());
  const due = await db.employeePromotion.findMany({
    where: { status: 'DIJADWALKAN', tanggalMulai: { lte: today } },
    include: { employee: true },
  });

  let applied = 0;
  let cancelled = 0;

  for (const promo of due) {
    const requiredOrigin = ORIGIN_STATUS[promo.jenisPromosi];
    if (requiredOrigin && promo.employee.statusKaryawan !== requiredOrigin) {
      // Status karyawan sudah berubah sejak promosi dijadwalkan (misal sudah dipromosikan manual) — batalkan.
      await db.employeePromotion.update({ where: { id: promo.id }, data: { status: 'DIBATALKAN' } });
      cancelled++;
      continue;
    }

    const shouldTouchTanggalSelesai = promo.jenisPromosi !== 'PERUBAHAN_GAJI' || promo.tanggalSelesai !== null;
    await db.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: promo.employeeId },
        data: {
          statusKaryawan: promo.statusBaru,
          nominalUpah: promo.nominalUpahBaru,
          satuanUpah: promo.satuanUpahBaru,
          nominalUpahLembur: promo.nominalUpahLemburBaru,
          pengaliLembur: promo.pengaliLemburBaru,
          ...(shouldTouchTanggalSelesai ? { tanggalAkhirKontrak: promo.tanggalSelesai } : {}),
          ...(promo.kontrakKeBaru !== null ? { kontrakKe: promo.kontrakKeBaru } : {}),
          ...(TOUCHES_KONTRAK[promo.jenisPromosi] ? { statusAktif: true } : {}),
        },
      });
      await tx.employeePromotion.update({
        where: { id: promo.id },
        data: { status: 'AKTIF', appliedAt: new Date() },
      });
    });
    applied++;
  }

  return { applied, cancelled };
}

export function originStatusFor(jenisPromosi: JenisPromosi): StatusKaryawan | null {
  return ORIGIN_STATUS[jenisPromosi];
}
