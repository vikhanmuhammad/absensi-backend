import { Request, Response } from 'express';
import { db } from '../../../../utils/db';
import { apiOk, handleError } from '../../../../tools/common';
import { requireAuth } from '../../../../middlewares/auth.middleware';

export const patch = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await db.notification.updateMany({
        where: { id, userId: req.user!.userId },
        data: { sudahDibaca: true },
      });
      return apiOk(res, null, 'Notifikasi ditandai sudah dibaca');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
