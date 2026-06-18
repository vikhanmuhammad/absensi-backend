import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { startOfDay, omitLocationIfNotPrivileged } from '../../../services/attendanceService';

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const employeeId = req.user!.employeeId;
      if (!employeeId) return apiError(res, 'Akun ini tidak terhubung ke data karyawan', 400);

      const tanggal = startOfDay(new Date());
      const attendance = await db.attendance.findUnique({ where: { employeeId_tanggal: { employeeId, tanggal } } });

      return apiOk(res, omitLocationIfNotPrivileged(attendance, req.user!.role), 'Status absensi hari ini berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
