import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const updateSchema = z.object({
  statusAktif: z.boolean(),
});

export const patch = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const data = updateSchema.parse(req.body);

      const existing = await db.user.findUnique({ where: { id } });
      if (!existing) return apiError(res, 'Akun tidak ditemukan', 404);

      const updated = await db.user.update({
        where: { id },
        data: { statusAktif: data.statusAktif },
        select: {
          id: true,
          username: true,
          role: true,
          superAdminType: true,
          statusAktif: true,
          lastActiveAt: true,
          employee: { select: { namaLengkap: true, jabatan: true } },
        },
      });

      return apiOk(res, updated, data.statusAktif ? 'Akun berhasil diaktifkan' : 'Akun berhasil dinonaktifkan');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
