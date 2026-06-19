import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const project = await db.project.findUnique({
        where: { id },
        include: {
          spvProject: true,
          assignments: { include: { employee: true } },
          manpowerRequests: { include: { divisiAsal: true, employee: true } },
        },
      });
      if (!project) return apiError(res, 'Projek tidak ditemukan', 404);
      return apiOk(res, project, 'Detail projek berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

// TODO: implement penarikan SPV Project lebih cepat dari Due Date & penyelesaian projek manual
// (lihat docs/flow.md bagian "Auto-Reactivation Saat Penugasan/Projek Berakhir").
