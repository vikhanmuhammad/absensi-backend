import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

export const get = [
  requireAuth,
  requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      // Supervisor hanya melihat pengajuan dari divisi sendiri
      const where: Record<string, unknown> = { status: 'MENUNGGU' };

      if (req.user!.role === 'SUPERVISOR' && req.user!.employeeId) {
        const supervisor = await db.employee.findUnique({
          where: { id: req.user!.employeeId },
          select: { divisiId: true },
        });
        if (supervisor) {
          where.employee = { divisiId: supervisor.divisiId };
        }
      }

      const leaveRequests = await db.leaveRequest.findMany({
        where,
        include: { employee: { include: { divisi: true } } },
        orderBy: { tanggalMulai: 'asc' },
      });

      return apiOk(res, leaveRequests, 'Pengajuan cuti yang menunggu approval berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
