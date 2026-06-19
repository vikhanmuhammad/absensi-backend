import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const createSchema = z.object({
  namaDivisi: z.string().min(1, 'Nama divisi wajib diisi'),
  supervisorEmployeeId: z.coerce.number().optional(),
});

export const get = [
  requireAuth,
  async (_req: Request, res: Response) => {
    try {
      const divisions = await db.division.findMany({
        include: { supervisor: true, _count: { select: { employees: true } } },
        orderBy: { namaDivisi: 'asc' },
      });
      return apiOk(res, divisions, 'Daftar divisi berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

export const post = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const data = createSchema.parse(req.body);
      const division = await db.division.create({ data });
      return apiOk(res, division, 'Divisi berhasil dibuat', 201);
    } catch (error) {
      return handleError(res, error);
    }
  },
];
