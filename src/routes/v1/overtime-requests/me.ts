import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const employeeId = req.user!.employeeId;
      if (!employeeId) return apiError(res, 'Akun ini tidak terhubung ke data karyawan', 400);

      const overtimeRequests = await db.overtimeRequest.findMany({
        where: { employeeId },
        orderBy: { tanggal: 'desc' },
      });

      return apiOk(res, overtimeRequests, 'Riwayat pengajuan lembur berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
