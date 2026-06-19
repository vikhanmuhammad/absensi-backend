import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { isSpvOfAnyActiveProject } from '../../../services/attendanceService';

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await db.user.findUnique({
        where: { id: req.user!.userId },
        include: { employee: { include: { divisi: true } } },
      });
      if (!user) return apiError(res, 'User tidak ditemukan', 404);

      const isSpvProject = user.employee ? await isSpvOfAnyActiveProject(user.employee.id) : false;
      const data = { ...user, employee: user.employee ? { ...user.employee, isSpvProject } : null };

      return apiOk(res, data, 'Data user berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
