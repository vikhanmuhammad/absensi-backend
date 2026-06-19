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
      // Supervisor hanya melihat pengajuan lembur individual dari divisi sendiri.
      const where: Record<string, unknown> = { jenis: 'INDIVIDUAL', status: 'DIAJUKAN' };

      if (req.user!.role === 'SUPERVISOR' && req.user!.employeeId) {
        const supervisor = await db.employee.findUnique({
          where: { id: req.user!.employeeId },
          select: { divisiId: true },
        });
        if (supervisor) {
          where.employee = { divisiId: supervisor.divisiId };
        }
      }

      const overtimeRequests = await db.overtimeRequest.findMany({
        where,
        include: { employee: { include: { divisi: true } } },
        orderBy: { tanggal: 'asc' },
      });

      return apiOk(res, overtimeRequests, 'Pengajuan lembur yang menunggu approval berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
