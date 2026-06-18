import { Request, Response } from 'express';
import { db } from '../../../utils/db';
import { apiOk, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';

export const get = [
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const notifications = await db.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
      });
      return apiOk(res, notifications, 'Notifikasi berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];
