import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const querySchema = z.object({
  search: z.string().optional(),
  projectId: z.string().optional(),
  divisiId: z.string().optional(),
});

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const filter = querySchema.parse(req.query);

      const assignments = await db.projectAssignment.findMany({
        where: {
          projectId: filter.projectId,
          employee: {
            divisiId: filter.divisiId,
            namaLengkap: filter.search ? { contains: filter.search } : undefined,
          },
        },
        include: { employee: { include: { divisi: true } }, project: true },
        orderBy: { tanggalMulai: 'desc' },
      });

      return apiOk(res, assignments, 'Riwayat penugasan berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
