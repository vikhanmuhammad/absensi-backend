import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';

export const patch = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      await db.notification.updateMany({
        where: { userId: req.user!.userId, sudahDibaca: false },
        data: { sudahDibaca: true },
      });
      return apiOk(res, null, 'Semua notifikasi ditandai sudah dibaca');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
