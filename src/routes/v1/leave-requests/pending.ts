import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

// TODO: filter pending sesuai wewenang aktor (Supervisor hanya divisinya, HRD semua) —
// lihat docs/flow.md "Role & Hak Akses" dan FR-REQ-02 (approver setara, bukan berjenjang).
export const get = [
  requireAuth,
  requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']),
  async (_req: Request, res: Response) => {
    try {
      const leaveRequests = await db.leaveRequest.findMany({
        where: { status: 'MENUNGGU' },
        include: { employee: { include: { divisi: true } } },
        orderBy: { tanggalMulai: 'asc' },
      });

      return apiOk(res, leaveRequests, 'Pengajuan cuti yang menunggu approval berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
