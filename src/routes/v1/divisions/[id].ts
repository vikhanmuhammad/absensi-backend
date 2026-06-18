import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const updateSchema = z.object({
  namaDivisi: z.string().optional(),
  supervisorEmployeeId: z.string().optional(),
});

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const division = await db.division.findUnique({
        where: { id },
        include: { supervisor: true, employees: true },
      });
      if (!division) return apiError(res, 'Divisi tidak ditemukan', 404);
      return apiOk(res, division, 'Detail divisi berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

export const patch = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const data = updateSchema.parse(req.body);

      const existing = await db.division.findUnique({ where: { id } });
      if (!existing) return apiError(res, 'Divisi tidak ditemukan', 404);

      const updated = await db.division.update({ where: { id }, data });
      return apiOk(res, updated, 'Divisi berhasil diperbarui');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
