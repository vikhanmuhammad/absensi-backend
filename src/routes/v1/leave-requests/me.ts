import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';

const PRIVILEGED_ROLES: Role[] = ['SUPER_ADMIN', 'HRD', 'SUPERVISOR'];

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const queryEmployeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
      const role = req.user!.role;

      // Role privileged boleh melihat riwayat cuti karyawan lain (dipakai halaman Detail Karyawan);
      // selain itu selalu dibatasi ke datanya sendiri walau ada query employeeId yang dikirim.
      const employeeId =
        queryEmployeeId && PRIVILEGED_ROLES.includes(role) ? queryEmployeeId : req.user!.employeeId ?? undefined;

      if (!employeeId) return apiError(res, 'Akun ini tidak terhubung ke data karyawan', 400);

      const leaveRequests = await db.leaveRequest.findMany({
        where: { employeeId },
        orderBy: { tanggalMulai: 'desc' },
      });

      return apiOk(res, leaveRequests, 'Riwayat pengajuan cuti berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
