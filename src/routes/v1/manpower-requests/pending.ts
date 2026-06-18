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
      const divisiId = req.query.divisiId as string | undefined;

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
