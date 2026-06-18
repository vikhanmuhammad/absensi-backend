import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';
import { startOfDay } from '../../../services/attendanceService';

const bulkSchema = z.object({
  employeeId: z.string().min(1),
  tanggal: z.string().min(1),
  jamMasuk: z.string().min(1),
  jamKeluar: z.string().optional(),
  deskripsiInputMassal: z.string().min(1, 'Deskripsi/alasan input massal wajib diisi'),
});

export const post = [
  requireAuth,
  requireRole(['SUPERVISOR', 'SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const input = bulkSchema.parse(req.body);
      // TODO: validasi aktor (Supervisor divisi terkait / SPV Project anggota projeknya)
      // punya wewenang atas employeeId target sebelum insert — lihat FR-ABS-04.
      const tanggal = startOfDay(new Date(input.tanggal));

      const attendance = await db.attendance.upsert({
        where: { employeeId_tanggal: { employeeId: input.employeeId, tanggal } },
        create: {
          employeeId: input.employeeId,
          tanggal,
          jamMasuk: new Date(input.jamMasuk),
          jamKeluar: input.jamKeluar ? new Date(input.jamKeluar) : null,
          namaProjekAktivitas: 'Input massal oleh atasan',
          lokasiKerja: 'KANTOR',
          statusKehadiran: 'TEPAT_WAKTU',
          inputByUserId: req.user!.userId,
          deskripsiInputMassal: input.deskripsiInputMassal,
        },
        update: {
          jamMasuk: new Date(input.jamMasuk),
          jamKeluar: input.jamKeluar ? new Date(input.jamKeluar) : null,
          inputByUserId: req.user!.userId,
          deskripsiInputMassal: input.deskripsiInputMassal,
        },
      });

      return apiOk(res, attendance, 'Absensi massal berhasil disimpan');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
