import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';

const createSchema = z.object({
  jenisCuti: z.enum(['IZIN', 'CUTI_TAHUNAN', 'SAKIT', 'MELAHIRKAN']),
  tanggalMulai: z.string().min(1),
  tanggalSelesai: z.string().min(1),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
  dokumenPendukungUrl: z.string().optional(),
});

export const post = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const employeeId = req.user!.employeeId;
      if (!employeeId) return apiError(res, 'Akun ini tidak terhubung ke data karyawan', 400);

      const data = createSchema.parse(req.body);
      const leaveRequest = await db.leaveRequest.create({
        data: {
          employeeId,
          jenisCuti: data.jenisCuti,
          tanggalMulai: new Date(data.tanggalMulai),
          tanggalSelesai: new Date(data.tanggalSelesai),
          alasan: data.alasan,
          dokumenPendukungUrl: data.dokumenPendukungUrl,
        },
      });

      return apiOk(res, leaveRequest, 'Pengajuan cuti berhasil dikirim', 201);
    } catch (error) {
      return handleError(res, error);
    }
  },
];

// TODO: implement perhitungan sisa kuota cuti tahunan (FR-REQ-06) — kurangi kuota saat
// CUTI_TAHUNAN disetujui, aktivasi kuota untuk karyawan kontrak sesuai masa kerja.
