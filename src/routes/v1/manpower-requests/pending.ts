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
      // Supervisor hanya melihat request dari divisinya sendiri (override query param demi keamanan).
      // HRD/Super Admin boleh memfilter divisi manapun lewat query, atau tanpa filter untuk lihat semua.
      let divisiId = req.query.divisiId ? Number(req.query.divisiId) : undefined;
      if (req.user!.role === 'SUPERVISOR') {
        const supervisor = req.user!.employeeId
          ? await db.employee.findUnique({ where: { id: req.user!.employeeId }, select: { divisiId: true } })
          : null;
        divisiId = supervisor?.divisiId;
      }

      const manpowerRequests = await db.manpowerRequest.findMany({
        where: { status: 'MENUNGGU', divisiAsalId: divisiId },
        include: { project: true, divisiAsal: true, employee: true },
        orderBy: { tanggalMulaiPenugasan: 'asc' },
      });

      return apiOk(res, manpowerRequests, 'Request manpower yang menunggu approval berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
