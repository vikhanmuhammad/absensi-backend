import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']),
  async (_req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalKaryawanAktif, hadirHariIni, terlambatHariIni, alfaHariIni, cutiAktif] = await Promise.all([
        db.employee.count({ where: { statusAktif: true } }),
        db.attendance.count({ where: { tanggal: today, jamMasuk: { not: null } } }),
        db.attendance.count({ where: { tanggal: today, statusKehadiran: 'TERLAMBAT' } }),
        db.attendance.count({ where: { tanggal: today, statusKehadiran: 'ALFA' } }),
        db.leaveRequest.count({
          where: { status: 'DISETUJUI', tanggalMulai: { lte: today }, tanggalSelesai: { gte: today } },
        }),
      ]);

      return apiOk(
        res,
        { totalKaryawanAktif, hadirHariIni, terlambatHariIni, alfaHariIni, cutiAktif },
        'Ringkasan dashboard berhasil diambil',
      );
    } catch (error) {
      return handleError(res, error);
    }
  },
];
