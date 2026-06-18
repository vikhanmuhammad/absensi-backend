import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD']),
  async (_req: Request, res: Response) => {
    try {
      const users = await db.user.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          superAdminType: true,
          statusAktif: true,
          lastActiveAt: true,
          employee: { select: { namaLengkap: true, jabatan: true } },
        },
        orderBy: { username: 'asc' },
      });
      return apiOk(res, users, 'Daftar akun pengguna berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

// TODO: implement create akun baru (FR-MAK-01) dan alur reset/perubahan password (FR-MAK-02) —
// untuk versi ini, hanya pengaktifan/penonaktifan akun yang tersedia lewat [id].ts.
