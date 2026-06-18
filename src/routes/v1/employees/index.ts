import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const listQuerySchema = z.object({
  search: z.string().optional(),
  divisiId: z.string().optional(),
  statusKaryawan: z.enum(['TETAP', 'KONTRAK', 'HARIAN']).optional(),
});

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']),
  async (req: Request, res: Response) => {
    try {
      const filter = listQuerySchema.parse(req.query);

      const employees = await db.employee.findMany({
        where: {
          divisiId: filter.divisiId,
          statusKaryawan: filter.statusKaryawan,
          namaLengkap: filter.search ? { contains: filter.search } : undefined,
        },
        include: { divisi: true },
        orderBy: { namaLengkap: 'asc' },
      });

      return apiOk(res, employees, 'Daftar karyawan berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

// TODO: implement POST untuk onboarding karyawan baru + akun User terkait sekaligus
// (lihat FR-MDK-01/02 & FR-MAK-01 di docs/flow.md).
